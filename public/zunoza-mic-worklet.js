class ZunozaMicProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buf = new Float32Array(1024);
    this._off = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      this._buf[this._off++] = ch[i];
      if (this._off >= this._buf.length) {
        this.port.postMessage(this._buf.slice());
        this._off = 0;
      }
    }
    return true;
  }
}
registerProcessor("zunoza-mic", ZunozaMicProcessor);

class ZunozaPlayProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.q = [];
    this.off = 0;
    this.queued = 0;
    this.primed = false;
    this.port.onmessage = (e) => {
      const d = e.data;
      if (d && d.flush) {
        this.q = [];
        this.off = 0;
        this.queued = 0;
        return;
      }
      if (d instanceof Float32Array && d.length) {
        this.q.push(d);
        this.queued += d.length;
      }
    };
  }
  process(_inputs, outputs) {
    const out = outputs[0] && outputs[0][0];
    if (!out) return true;
    const primeNeed = Math.max(480, Math.floor(sampleRate * 0.04));
    if (!this.primed) {
      if (this.queued < primeNeed) {
        out.fill(0);
        return true;
      }
      this.primed = true;
    }
    let i = 0;
    while (i < out.length) {
      if (!this.q.length) {
        out.fill(0, i);
        break;
      }
      const c = this.q[0];
      const n = Math.min(c.length - this.off, out.length - i);
      out.set(c.subarray(this.off, this.off + n), i);
      i += n;
      this.off += n;
      this.queued -= n;
      if (this.off >= c.length) {
        this.q.shift();
        this.off = 0;
      }
    }
    return true;
  }
}
registerProcessor("zunoza-play", ZunozaPlayProcessor);
