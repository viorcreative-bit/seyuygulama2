import numpy as np, subprocess, json, os, sys
from scipy.signal import fftconvolve, butter, sosfilt
from scipy.io import wavfile
D = sys.argv[1]; os.chdir(D)
TEMPO = sys.argv[2] if len(sys.argv) > 2 else "0.95"  # Google sesi için yavaşlatma; Edge seslerinde 1.0
SR = 44100
def sh(*a): subprocess.run(a, check=True, capture_output=True)

# 1) clean voice lines
vo = {}
for p in ["04","05","06","07","08","09","10","11","12","17","18","19"]:
    sh("ffmpeg","-y","-i",f"vo_{p}.mp3","-af",
       "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,"
       "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,"
       f"atempo={TEMPO},highpass=f=70,equalizer=f=180:t=q:w=1:g=2,loudnorm=I=-16:TP=-2:LRA=7",
       "-ar",str(SR),"-ac","1",f"vo_{p}.wav")
    sr, x = wavfile.read(f"vo_{p}.wav"); vo[p] = x.astype(np.float32)/32768.0

# 2) page plan: (page, voice id or None, fixed duration or None)
plan = [(1,None,5.0),(2,None,6.25),(3,None,5.0)]  # 2. sayfadaki gerçek video 6,25 sn
plan += [(i,f"{i:02d}",None) for i in range(4,13)]
plan += [(13,None,5.5),(14,None,5.5),(15,None,5.5),(16,None,5.5)]
plan += [(17,"17",None),(18,"18",None),(19,"19",None)]
segs=[]
for page,v,fixed in plan:
    lead = 0.8 if page==19 else 0.6
    if v is None: dur = fixed
    else:
        dur = lead + len(vo[v])/SR + (4.0 if page==19 else 1.0)
        dur = max(dur, 5.0)
    segs.append(dict(page=page, voice=v, lead=lead, dur=round(dur,2)))
total = sum(s["dur"] for s in segs)

# 3) music
bpm=66; beat=60/bpm; e8=beat/2; bar=4*beat
mid=lambda m: 440*2**((m-69)/12)
CH={"Am":(45,[57,60,64,69]),"F":(41,[53,57,60,65]),"C":(48,[55,60,64,67]),"G":(43,[55,59,62,67])}
prog=["Am","F","C","G"]
nbars=int(np.ceil(total/bar))+1
L=int((total+4)*SR); mus=np.zeros((L,2),np.float32)
def piano(f,vel,dur=3.2):
    t=np.arange(int(dur*SR))/SR; B=0.0004; y=np.zeros_like(t)
    amps=[1,.45,.28,.16,.09,.05,.03,.02]; d0=0.9+f/700
    for k,a in enumerate(amps,1):
        fk=f*k*np.sqrt(1+B*k*k)
        if fk>16000: break
        y+=a*np.sin(2*np.pi*fk*t)*np.exp(-t*(d0+0.55*k))
    att=np.minimum(1,t/0.004); return (vel*y*att).astype(np.float32)
def add(sig,start,pan):
    i=int(start*SR)
    if i>=L: return
    j=min(L,i+len(sig)); s=sig[:j-i]
    mus[i:j,0]+=s*(1-pan)*1.0; mus[i:j,1]+=s*(pan)*1.0
rng=np.random.default_rng(7)
pattern=[0,1,2,3,2,1,2,1]
for b in range(nbars):
    name=prog[b%4]
    if b==nbars-1: name="C"
    bass,up=CH[name]; t0=b*bar
    add(piano(mid(bass),0.55,4.0),t0,0.45)
    add(piano(mid(bass+12),0.18,3.0),t0+2*beat,0.45)
    for n,idx in enumerate(pattern):
        m=up[idx]; vel=0.32*(1.0 if n%2==0 else 0.8)*(0.9+0.2*rng.random())
        add(piano(mid(m),vel),t0+n*e8+rng.normal(0,0.006),0.35+0.3*(m-53)/20)
    if b%2==1 and b>1:  # sparse high melody
        add(piano(mid(up[2]+12),0.16,3.5),t0+beat*0.02,0.6)
    # pad
    t=np.arange(int((bar+1.5)*SR))/SR; env=np.minimum(1,t/1.2)*np.clip((bar+1.5-t)/1.5,0,1)
    pad=sum(np.sin(2*np.pi*mid(m)*(1+d)*t) for m in up[:3] for d in (-0.0015,0.0015))
    add((0.018*pad*env).astype(np.float32),t0,0.5)
# reverb
tir=np.arange(int(2.6*SR))/SR
sos=butter(2,4500,btype="low",fs=SR,output="sos")
wet=np.zeros_like(mus)
for c in range(2):
    ir=sosfilt(sos,rng.normal(0,1,len(tir)))*np.exp(-tir/0.65); ir/=np.sqrt((ir**2).sum())
    wet[:,c]=fftconvolve(mus[:,c],ir)[:L]
mus=0.75*mus+0.45*wet
mus=sosfilt(butter(2,9000,btype="low",fs=SR,output="sos"),mus,axis=0)
mus=sosfilt(butter(1,60,btype="high",fs=SR,output="sos"),mus,axis=0).astype(np.float32)
mus/=np.max(np.abs(mus))+1e-9
# fades
tt=np.arange(L)/SR
fade=np.minimum(1,tt/2.5)*np.clip((total-tt)/4.5,0,1)
mus*=fade[:,None]
# 4) voice track + ducking
vtrack=np.zeros(L,np.float32); active=np.zeros(L,np.float32); pos=0.0
for s in segs:
    s["start"]=round(pos,3)
    if s["voice"]:
        x=vo[s["voice"]]; i=int((pos+s["lead"])*SR); vtrack[i:i+len(x)]+=x; active[i:i+len(x)]=1
    pos+=s["dur"]
k=int(0.35*SR); kern=np.ones(k)/k
act=np.convolve(np.convolve(active,kern,"same"),kern,"same")
music_gain=10**(-14/20)*(1-act*(1-10**(-4/20)))   # quiet bed, -4 dB more under voice
mix=mus*music_gain[:,None]+vtrack[:,None]*0.95
mix=mix[:int(total*SR)]
peak=np.max(np.abs(mix)); mix*=min(1,0.93/peak)
wavfile.write("full_mix.wav",SR,(mix*32767).astype(np.int16))
wavfile.write("music_only.wav",SR,((mus*music_gain[:,None])[:int(total*SR)]*32767/np.max(np.abs(mix)+1e-9)*0.93).astype(np.int16))
# 5) slices
os.makedirs("segs",exist_ok=True)
for s in segs:
    a=int(round(s["start"]*SR)); b=a+int(round(s["dur"]*SR)); x=mix[a:b].copy()
    f=int(0.008*SR); x[:f]*=np.linspace(0,1,f)[:,None]; x[-f:]*=np.linspace(1,0,f)[:,None]
    wavfile.write(f"segs/p{s['page']:02d}.wav",SR,(x*32767).astype(np.int16))
json.dump(dict(total=round(total,2),segs=segs),open("plan.json","w"),indent=1)
print(json.dumps(dict(total=round(total,2),segs=[(s['page'],s['dur'],s['voice']) for s in segs])))
