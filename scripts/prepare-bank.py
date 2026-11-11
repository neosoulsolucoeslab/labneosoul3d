"""Prepare the owner-provided bank locally. Output is ignored by git; upload only to private R2."""
import argparse, json, pathlib, re
from PIL import Image, ImageOps
p=argparse.ArgumentParser();p.add_argument('--manifest',required=True);p.add_argument('--input',required=True);p.add_argument('--output',default='bank-private');args=p.parse_args()
manifest=json.loads(pathlib.Path(args.manifest).read_text(encoding='utf-8'))
root=pathlib.Path(args.input).resolve();out=pathlib.Path(args.output).resolve();prepared=[]
allowed={'special','trophy','medal','keychain','display','prototype','decor','symbol','channel-letter'}
for entry in manifest['images']:
    if entry.get('approved') is not True: continue
    source=(root/entry['source']).resolve()
    if not source.is_relative_to(root): raise ValueError('Arquivo fora da pasta de entrada')
    key=entry['key']
    if not re.fullmatch(r'bank/[a-zA-Z0-9/_-]+\.jpg',key): raise ValueError('Chave R2 inválida')
    if not entry['objects'] or not set(entry['objects']) <= allowed: raise ValueError('Tipo de peça inválido')
    if len(entry['caption'])>180 or not isinstance(entry['tags'],list): raise ValueError('Metadados inválidos')
    with Image.open(source) as raw:
        image=ImageOps.exif_transpose(raw).convert('RGBA');image.thumbnail((512,512))
        flat=Image.new('RGB',image.size,'white');flat.paste(image,mask=image.getchannel('A'))
        target=out/key;target.parent.mkdir(parents=True,exist_ok=True);flat.save(target,'JPEG',quality=90,optimize=True)
    prepared.append({k:entry[k] for k in ['key','objects','tags','caption','approved']})
if not prepared: raise ValueError('Adicione ao menos uma imagem aprovada ao manifesto')
(out/'bank').mkdir(parents=True,exist_ok=True)
(out/'bank/manifest.json').write_text(json.dumps({'version':1,'images':prepared},ensure_ascii=False,indent=2),encoding='utf-8')
print(f'{len(prepared)} referências preparadas em {out}. Não envie esta pasta para o GitHub público.')
