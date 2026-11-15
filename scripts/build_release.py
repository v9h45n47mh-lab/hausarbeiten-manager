"""Build and verify deterministic integration install packages."""
from pathlib import Path
import hashlib,json,zipfile
ROOT=Path(__file__).resolve().parents[1]
component=next((ROOT/'custom_components').glob('*/manifest.json')).parent
manifest=json.loads((component/'manifest.json').read_text());version=manifest['version'];domain=manifest['domain']
files=sorted(p for p in component.rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix!='.pyc')
out=ROOT/'dist';out.mkdir(exist_ok=True)
archives=[]
for name,base in [(f'{domain}-{version}.zip',ROOT),(f'{domain}.zip',component)]:
 path=out/name
 with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED) as z:
  for p in files:
   info=zipfile.ZipInfo(p.relative_to(base).as_posix(),(2026,11,15,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,p.read_bytes())
 with zipfile.ZipFile(path) as z:
  assert z.testzip() is None
  for p in files:assert z.read(p.relative_to(base).as_posix())==p.read_bytes()
 archives.append(path)
(out/'SHA256SUMS.txt').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n' for p in archives))
print(version,[p.name for p in archives])
