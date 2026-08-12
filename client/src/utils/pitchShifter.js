// client/src/utils/pitchShifter.js
// Chris Wilson's Pitch Shifter (Jungle) implementation

export class PitchShifter {
  constructor(context) {
    this.context = context;
    this.input = context.createGain();
    this.output = context.createGain();

    this._pitch = 1.0;

    // Subgraph nodes
    this.delay1 = context.createDelay(1.0);
    this.delay2 = context.createDelay(1.0);

    this.gain1 = context.createGain();
    this.gain2 = context.createGain();

    this.osc1 = context.createOscillator();
    this.osc2 = context.createOscillator();

    this.oscGain1 = context.createGain();
    this.oscGain2 = context.createGain();

    this.fade1 = context.createDelay(1.0);
    this.fade2 = context.createDelay(1.0);

    // Constant Source
    this.constSource = context.createConstantSource ? context.createConstantSource() : null;
    if (this.constSource) {
      this.constSource.offset.value = 1.0;
      this.constSource.start();
    }

    // Connect audio path
    this.input.connect(this.delay1);
    this.input.connect(this.delay2);

    this.delay1.connect(this.gain1);
    this.delay2.connect(this.gain2);

    this.gain1.connect(this.output);
    this.gain2.connect(this.output);

    // Pitch shifting modulation parameters
    this.delayTime = 0.100; // 100ms
    this.fadeTime = 0.050; // 50ms

    // Set delay values
    this.delay1.delayTime.value = 0.025;
    this.delay2.delayTime.value = 0.025;

    // Crossfading LFOs
    this.osc1.type = "sawtooth";
    this.osc2.type = "sawtooth";

    this.osc1.frequency.value = 10.0;
    this.osc2.frequency.value = 10.0;

    this.oscGain1.gain.value = 0.025;
    this.oscGain2.gain.value = 0.025;

    // Connect modulation paths
    this.osc1.connect(this.oscGain1);
    this.osc2.connect(this.oscGain2);

    this.oscGain1.connect(this.delay1.delayTime);
    this.oscGain2.connect(this.delay2.delayTime);

    // Crossfade windowing gains
    this.fadeOsc1 = context.createOscillator();
    this.fadeOsc2 = context.createOscillator();
    this.fadeOsc1.frequency.value = 10.0;
    this.fadeOsc2.frequency.value = 10.0;

    // Sine/Triangle windows
    this.fadeOsc1.type = "triangle";
    this.fadeOsc2.type = "triangle";

    this.fadeGain1 = context.createGain();
    this.fadeGain2 = context.createGain();
    this.fadeGain1.gain.value = 0.5;
    this.fadeGain2.gain.value = 0.5;

    this.fadeOffset1 = context.createGain();
    this.fadeOffset2 = context.createGain();
    this.fadeOffset1.gain.value = 0.5;
    this.fadeOffset2.gain.value = 0.5;

    if (this.constSource) {
      this.constSource.connect(this.fadeOffset1);
      this.constSource.connect(this.fadeOffset2);
    }

    this.fadeOsc1.connect(this.fadeGain1);
    this.fadeOsc2.connect(this.fadeGain2);

    this.fadeGain1.connect(this.gain1.gain);
    this.fadeGain2.connect(this.gain2.gain);

    // Start LFO oscillators
    this.osc1.start();
    this.osc2.start();
    
    this.setPitch(1.0);
  }

  setPitch(pitch) {
    this._pitch = pitch;
    
    if (Math.abs(pitch - 1.0) < 0.01) {
      // Direct pass-through
      this.oscGain1.gain.value = 0;
      this.oscGain2.gain.value = 0;
      this.delay1.delayTime.value = 0;
      this.delay2.delayTime.value = 0;
      this.gain1.gain.value = 0.5;
      this.gain2.gain.value = 0.5;
      return;
    }

    const frequency = (pitch - 1.0) / this.delayTime;
    this.osc1.frequency.value = -frequency;
    this.osc2.frequency.value = -frequency;

    // Scale sweep amplitude to delay duration
    this.oscGain1.gain.value = this.delayTime / 2;
    this.oscGain2.gain.value = this.delayTime / 2;

    // Offset delay 2 LFO phase
    this.delay1.delayTime.value = this.delayTime / 2;
    this.delay2.delayTime.value = this.delayTime / 2;
  }
}
