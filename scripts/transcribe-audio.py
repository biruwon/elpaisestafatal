"""Local speech adapter. Model preparation is explicit; requests stay offline."""
import json
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
READY = ROOT / '.local' / f'speech-ready-{sys.platform}.json'

if len(sys.argv) == 2 and sys.argv[1] == '--prepare':
    from faster_whisper.utils import download_model

    model = os.environ.get('LOCAL_SPEECH_MODEL', 'small')
    path = download_model(model, cache_dir=str(ROOT / '.local' / 'speech-models'))
    READY.write_text(json.dumps({'model': model, 'path': path, 'python': sys.executable}))
    print('Local speech model prepared.')
else:
    if len(sys.argv) != 2 or not READY.exists():
        raise SystemExit('Run npm run speech:setup before transcribing audio.')
    from faster_whisper import WhisperModel
    import av
    import numpy as np

    configuration = json.loads(READY.read_text())
    formats = {'.wav': 'wav', '.ogg': 'ogg', '.webm': 'matroska', '.flac': 'flac', '.mp3': 'mp3', '.m4a': 'mov'}
    format_name = formats.get(Path(sys.argv[1]).suffix.lower())
    if not format_name:
        raise SystemExit('Unsupported audio container.')
    samples = []
    count = 0
    # Decode only the declared audio container, with a hard duration bound.
    # A playlist disguised as audio must not open external files or URLs.
    with av.open(sys.argv[1], format=format_name) as container:
        resampler = av.AudioResampler(format='s16', layout='mono', rate=16000)
        for frame in container.decode(audio=0):
            for decoded in resampler.resample(frame):
                values = decoded.to_ndarray().flatten()
                count += len(values)
                if count > 120 * 16000:
                    raise SystemExit('Audio must be at most two minutes.')
                samples.append(values)
        for decoded in resampler.resample(None):
            samples.append(decoded.to_ndarray().flatten())
    if not samples:
        raise SystemExit('No audio samples detected.')
    audio = np.concatenate(samples).astype(np.float32) / 32768.0
    if len(audio) > 120 * 16000:
        raise SystemExit('Audio must be at most two minutes.')
    model = WhisperModel(configuration['path'], device='cpu', compute_type='int8', cpu_threads=4, local_files_only=True)
    segments, _ = model.transcribe(audio, beam_size=3, vad_filter=True, condition_on_previous_text=False)
    text = ' '.join(segment.text.strip() for segment in segments).strip()
    if not text:
        raise SystemExit('No speech detected.')
    print(text)
