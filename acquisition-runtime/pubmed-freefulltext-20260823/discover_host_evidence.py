from __future__ import annotations
import json, time, xml.etree.ElementTree as ET
from pathlib import Path
import requests

ROOT = Path('acquisition-runtime/pubmed-freefulltext-20260823')
PMIDS = [x.strip() for x in (ROOT/'pmids.txt').read_text().splitlines() if x.strip()]
EPMC='https://www.ebi.ac.uk/europepmc/webservices/rest/search'
PMC_OA='https://www.ncbi.nlm.nih.gov/pmc/utils/oa/oa.fcgi'
UNPAY='https://unpaywall-simple-query-tool-c76bcdcacd9a.herokuapp.com/v2/dois'
S=requests.Session(); S.headers.update({'User-Agent':'scholar-acquire-chatgpt/0.4.3 host-evidence/20260823'})

def req(method,url,**kw):
    last=None
    for i in range(4):
        try:
            r=S.request(method,url,timeout=60,**kw)
            return r
        except Exception as e:
            last=e; time.sleep(1+i)
    raise last

out={'schema_version':'1','pmids':PMIDS,'items':{},'unpaywall':{}}
dois=[]
for i,pmid in enumerate(PMIDS,1):
    print(f'identity {i}/{len(PMIDS)} PMID {pmid}',flush=True)
    item={'pmid':pmid}
    try:
        r=req('GET',EPMC,params={'query':f'EXT_ID:{pmid} AND SRC:MED','format':'json','resultType':'core','pageSize':1})
        item['europe_pmc_status']=r.status_code
        doc=r.json() if r.content else {}
        rows=((doc.get('resultList') or {}).get('result') or [])
        item['europe_pmc']=rows[0] if rows else None
        row=item['europe_pmc'] or {}
        doi=(row.get('doi') or '').strip().lower()
        if doi: dois.append(doi)
        pmcid=row.get('pmcid')
        if pmcid:
            pr=req('GET',PMC_OA,params={'id':pmcid})
            p={'status_code':pr.status_code,'url':str(pr.url),'record':None,'links':[]}
            try:
                root=ET.fromstring(pr.content)
                rec=root.find('.//record')
                if rec is not None:
                    p['record']=dict(rec.attrib)
                    p['links']=[dict(x.attrib) for x in rec.findall('.//link')]
            except Exception as e:
                p['parse_error']=f'{type(e).__name__}: {e}'
            item['pmc_oa']=p
    except Exception as e:
        item['error']=f'{type(e).__name__}: {e}'
    out['items'][pmid]=item
    if i%10==0: (ROOT/'host_evidence.partial.json').write_text(json.dumps(out,indent=2))

# Unpaywall Simple Query Tool accepts DOI batches. Keep chunks small for resilience.
for start in range(0,len(dois),25):
    chunk=dois[start:start+25]
    print(f'unpaywall DOI chunk {start+1}-{start+len(chunk)}',flush=True)
    try:
        r=req('POST',UNPAY,json={'dois':chunk})
        payload=r.json() if r.content else None
        if isinstance(payload,dict) and isinstance(payload.get('results'),dict): payload=payload['results']
        if isinstance(payload,dict):
            for k,v in payload.items(): out['unpaywall'][str(k).lower()]={'status_code':r.status_code,'source_url':str(r.url),'object':v}
        elif isinstance(payload,list):
            for v in payload:
                if isinstance(v,dict) and v.get('doi'): out['unpaywall'][str(v['doi']).lower()]={'status_code':r.status_code,'source_url':str(r.url),'object':v}
    except Exception as e:
        for doi in chunk: out['unpaywall'].setdefault(doi,{'status_code':None,'source_url':UNPAY,'object':None,'error':f'{type(e).__name__}: {e}'})

(ROOT/'host_evidence.json').write_text(json.dumps(out,indent=2,ensure_ascii=False)+'\n')
print(json.dumps({'pmid_count':len(PMIDS),'identity_records':sum(1 for x in out['items'].values() if x.get('europe_pmc')),'doi_count':len(dois),'unpaywall_records':len(out['unpaywall'])},indent=2))
