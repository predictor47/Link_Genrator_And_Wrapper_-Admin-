/**
 * Enhanced Device Fingerprinting and Behavioral Tracking
 * Comprehensive system for collecting device fingerprints and user behavior patterns
 */

export interface EnhancedFingerprint {
  // Basic device info
  deviceId: string;
  userAgent: string;
  platform: string;
  language: string;
  timezone: string;
  
  // Screen and display
  screen: {
    width: number;
    height: number;
    availWidth: number;
    availHeight: number;
    colorDepth: number;
    pixelRatio: number;
    orientation: string;
  };
  
  // Browser capabilities
  browser: {
    name: string;
    version: string;
    cookiesEnabled: boolean;
    doNotTrack: boolean;
    javaEnabled: boolean;
    onLine: boolean;
    plugins: string[];
    mimeTypes: string[];
  };
  
  // Hardware fingerprinting
  hardware: {
    cores: number;
    memory: number;
    deviceMemory?: number;
    hardwareConcurrency: number;
    maxTouchPoints: number;
    battery?: {
      level: number;
      charging: boolean;
      chargingTime: number;
      dischargingTime: number;
    };
  };
  
  // Network information
  network: {
    connectionType?: string;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
  
  // Graphics fingerprinting
  graphics: {
    webGL: {
      vendor: string;
      renderer: string;
      version: string;
      shadingLanguageVersion: string;
      extensions: string[];
      maxTextureSize: number;
      maxVertexTextureImageUnits: number;
      maxFragmentTextureImageUnits: number;
    };
    canvas: {
      fingerprint: string;
      geometry: string;
      text: string;
    };
  };
  
  // Audio fingerprinting
  audio: {
    context: {
      sampleRate: number;
      maxChannelCount: number;
      numberOfInputs: number;
      numberOfOutputs: number;
      channelCount: number;
      channelCountMode: string;
      channelInterpretation: string;
    };
    fingerprint: string;
    oscillator: string;
  };
  
  // Behavioral tracking
  behavioral: {
    mouseMovements: MouseMovement[];
    keyboardEvents: KeyboardEvent[];
    clickPattern: ClickEvent[];
    scrollEvents: ScrollEvent[];
    focusEvents: FocusEvent[];
    resizeEvents: ResizeEvent[];
    touchEvents: TouchEvent[];
    timeOnPage: number;
    idleTime: number;
    suspiciousPatterns: string[];
  };
  
  // Advanced detection
  advanced: {
    webRTC: {
      localIPs: string[];
      publicIP?: string;
      candidateTypes: string[];
    };
    fonts: string[];
    speechSynthesis: string[];
    mediaDevices: string[];
    permissions: Record<string, string>;
    gamepadCount: number;
    automationDetected: boolean;
    headlessDetected: boolean;
    webDriverDetected: boolean;
  };
  
  // Timestamps
  timestamps: {
    created: number;
    lastUpdated: number;
    sessionStart: number;
    pageLoad: number;
  };
}

interface MouseMovement {
  x: number;
  y: number;
  timestamp: number;
  pressure?: number;
  tiltX?: number;
  tiltY?: number;
}

interface KeyboardEvent {
  key: string;
  code: string;
  timestamp: number;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}

interface ClickEvent {
  x: number;
  y: number;
  timestamp: number;
  button: number;
  detail: number;
}

interface ScrollEvent {
  x: number;
  y: number;
  timestamp: number;
  deltaX: number;
  deltaY: number;
}

interface FocusEvent {
  type: 'focus' | 'blur';
  timestamp: number;
  target: string;
}

interface ResizeEvent {
  width: number;
  height: number;
  timestamp: number;
}

interface TouchEvent {
  x: number;
  y: number;
  timestamp: number;
  force?: number;
  radiusX?: number;
  radiusY?: number;
}

/**
 * Enhanced Fingerprinting Service
 */
export class EnhancedFingerprintingService {
  private fingerprint: Partial<EnhancedFingerprint> = {};
  private behaviorCollector: BehaviorCollector;
  private isCollecting = false;
  private sessionStart = Date.now();

  constructor() {
    this.behaviorCollector = new BehaviorCollector();
  }

  /**
   * Generate comprehensive device fingerprint
   */
  async generateFingerprint(): Promise<EnhancedFingerprint> {
    const startTime = Date.now();
    
    try {
      // Generate unique device ID based on multiple factors
      const deviceId = await this.generateDeviceId();
      
      // Collect all fingerprinting data
      const [
        basicInfo,
        screenInfo,
        browserInfo,
        hardwareInfo,
        networkInfo,
        graphicsInfo,
        audioInfo,
        advancedInfo
      ] = await Promise.all([
        this.collectBasicInfo(),
        this.collectScreenInfo(),
        this.collectBrowserInfo(),
        this.collectHardwareInfo(),
        this.collectNetworkInfo(),
        this.collectGraphicsInfo(),
        this.collectAudioInfo(),
        this.collectAdvancedInfo()
      ]);
      
      this.fingerprint = {
        deviceId,
        ...basicInfo,
        screen: screenInfo,
        browser: browserInfo,
        hardware: hardwareInfo,
        network: networkInfo,
        graphics: graphicsInfo,
        audio: audioInfo,
        behavioral: {
          mouseMovements: [],
          keyboardEvents: [],
          clickPattern: [],
          scrollEvents: [],
          focusEvents: [],
          resizeEvents: [],
          touchEvents: [],
          timeOnPage: 0,
          idleTime: 0,
          suspiciousPatterns: []
        },
        advanced: advancedInfo,
        timestamps: {
          created: startTime,
          lastUpdated: Date.now(),
          sessionStart: this.sessionStart,
          pageLoad: performance.now()
        }
      };
      
      // Start behavioral tracking
      this.startBehavioralTracking();
      
      return this.fingerprint as EnhancedFingerprint;
    } catch (error) {
      console.error('Error generating fingerprint:', error);
      throw error;
    }
  }

  /**
   * Generate unique device ID
   */
  private async generateDeviceId(): Promise<string> {
    const components = [
      navigator.userAgent,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      navigator.language,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.hardwareConcurrency,
      navigator.maxTouchPoints
    ];
    
    // Add WebGL renderer info if available
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') as WebGLRenderingContext | null;
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
        }
      }
    } catch (e) {
      // Ignore WebGL errors
    }
    
    const combined = components.join('|');
    return await this.hash(combined);
  }

  /**
   * Hash string using Web Crypto API
   */
  private async hash(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Collect basic device information
   */
  private async collectBasicInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  /**
   * Collect screen information
   */
  private async collectScreenInfo() {
    return {
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      pixelRatio: window.devicePixelRatio,
      orientation: screen.orientation?.type || 'unknown'
    };
  }

  /**
   * Collect browser information
   */
  private async collectBrowserInfo() {
    const plugins = Array.from(navigator.plugins).map(plugin => plugin.name);
    const mimeTypes = Array.from(navigator.mimeTypes).map(mimeType => mimeType.type);
    
    return {
      name: this.getBrowserName(),
      version: this.getBrowserVersion(),
      cookiesEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack === '1',
      javaEnabled: navigator.javaEnabled?.() || false,
      onLine: navigator.onLine,
      plugins,
      mimeTypes
    };
  }

  /**
   * Collect hardware information
   */
  private async collectHardwareInfo() {
    const hardware: any = {
      cores: navigator.hardwareConcurrency || 0,
      memory: (navigator as any).deviceMemory || 0,
      deviceMemory: (navigator as any).deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      maxTouchPoints: navigator.maxTouchPoints || 0
    };
    
    // Try to get battery info
    try {
      const battery = await (navigator as any).getBattery?.();
      if (battery) {
        hardware.battery = {
          level: battery.level,
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime
        };
      }
    } catch (e) {
      // Battery API not available
    }
    
    return hardware;
  }

  /**
   * Collect network information
   */
  private async collectNetworkInfo() {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    if (connection) {
      return {
        connectionType: connection.type,
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }
    
    return {};
  }

  /**
   * Collect graphics information
   */
  private async collectGraphicsInfo() {
    const canvas = document.createElement('canvas');
    const ctx2d = canvas.getContext('2d');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    const graphics: any = {
      webGL: {},
      canvas: {}
    };
    
    // WebGL fingerprinting with proper type casting
    if (gl) {
      const webglContext = gl as WebGLRenderingContext;
      const debugInfo = webglContext.getExtension('WEBGL_debug_renderer_info');
      graphics.webGL = {
        vendor: webglContext.getParameter(webglContext.VENDOR),
        renderer: debugInfo ? webglContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown',
        version: webglContext.getParameter(webglContext.VERSION),
        shadingLanguageVersion: webglContext.getParameter(webglContext.SHADING_LANGUAGE_VERSION),
        extensions: webglContext.getSupportedExtensions() || [],
        maxTextureSize: webglContext.getParameter(webglContext.MAX_TEXTURE_SIZE),
        maxVertexTextureImageUnits: webglContext.getParameter(webglContext.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
        maxFragmentTextureImageUnits: webglContext.getParameter(webglContext.MAX_TEXTURE_IMAGE_UNITS)
      };
    }
    
    // Canvas fingerprinting
    if (ctx2d) {
      canvas.width = 200;
      canvas.height = 50;
      
      ctx2d.textBaseline = 'top';
      ctx2d.font = '14px Arial';
      ctx2d.fillText('Device fingerprint test 🔒', 2, 2);
      ctx2d.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx2d.fillRect(10, 10, 100, 30);
      
      graphics.canvas = {
        fingerprint: canvas.toDataURL(),
        geometry: this.getCanvasGeometry(ctx2d),
        text: this.getCanvasTextFingerprint(ctx2d)
      };
    }
    
    return graphics;
  }

  /**
   * Collect audio fingerprinting
   */
  private async collectAudioInfo() {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const audio: any = {
        context: {
          sampleRate: audioContext.sampleRate,
          maxChannelCount: audioContext.destination.maxChannelCount,
          numberOfInputs: audioContext.destination.numberOfInputs,
          numberOfOutputs: audioContext.destination.numberOfOutputs,
          channelCount: audioContext.destination.channelCount,
          channelCountMode: audioContext.destination.channelCountMode,
          channelInterpretation: audioContext.destination.channelInterpretation
        },
        fingerprint: '',
        oscillator: ''
      };
      
      // Generate audio fingerprint using oscillator
      const oscillator = audioContext.createOscillator();
      const compressor = audioContext.createDynamicsCompressor();
      
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(10000, audioContext.currentTime);
      
      compressor.threshold.setValueAtTime(-50, audioContext.currentTime);
      compressor.knee.setValueAtTime(40, audioContext.currentTime);
      compressor.ratio.setValueAtTime(12, audioContext.currentTime);
      compressor.attack.setValueAtTime(0, audioContext.currentTime);
      compressor.release.setValueAtTime(0.25, audioContext.currentTime);
      
      oscillator.connect(compressor);
      compressor.connect(audioContext.destination);
      
      oscillator.start(0);
      oscillator.stop(audioContext.currentTime + 0.1);
      
      audio.fingerprint = compressor.reduction.toString();
      audio.oscillator = oscillator.frequency.toString();
      
      audioContext.close();
      return audio;
    } catch (e) {
      return {
        context: {},
        fingerprint: '',
        oscillator: ''
      };
    }
  }

  /**
   * Collect advanced detection information
   */
  private async collectAdvancedInfo() {
    const advanced: any = {
      webRTC: await this.getWebRTCInfo(),
      fonts: await this.detectFonts(),
      speechSynthesis: this.getSpeechSynthesisVoices(),
      mediaDevices: await this.getMediaDevices(),
      permissions: await this.checkPermissions(),
      gamepadCount: navigator.getGamepads ? navigator.getGamepads().length : 0,
      automationDetected: this.detectAutomation(),
      headlessDetected: this.detectHeadless(),
      webDriverDetected: this.detectWebDriver()
    };
    
    return advanced;
  }

  /**
   * Start behavioral tracking
   */
  private startBehavioralTracking() {
    if (this.isCollecting) return;
    
    this.isCollecting = true;
    this.behaviorCollector.start((behaviorData) => {
      if (this.fingerprint.behavioral) {
        Object.assign(this.fingerprint.behavioral, behaviorData);
        this.fingerprint.timestamps!.lastUpdated = Date.now();
      }
    });
  }

  /**
   * Stop behavioral tracking
   */
  stopBehavioralTracking() {
    this.isCollecting = false;
    this.behaviorCollector.stop();
  }

  /**
   * Get current fingerprint with latest behavioral data
   */
  getCurrentFingerprint(): EnhancedFingerprint | null {
    if (!this.fingerprint.deviceId) return null;
    
    return {
      ...this.fingerprint,
      behavioral: {
        ...this.fingerprint.behavioral!,
        timeOnPage: Date.now() - this.sessionStart
      },
      timestamps: {
        ...this.fingerprint.timestamps!,
        lastUpdated: Date.now()
      }
    } as EnhancedFingerprint;
  }

  // Helper methods
  private getBrowserName(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Unknown';
  }

  private getBrowserVersion(): string {
    const userAgent = navigator.userAgent;
    const match = userAgent.match(/(firefox|chrome|safari|edge|opera)\/(\d+)/i);
    return match ? match[2] : 'Unknown';
  }

  private getCanvasGeometry(ctx: CanvasRenderingContext2D): string {
    ctx.beginPath();
    ctx.arc(50, 25, 20, 0, Math.PI * 2);
    ctx.fill();
    return ctx.isPointInPath(50, 25).toString();
  }

  private getCanvasTextFingerprint(ctx: CanvasRenderingContext2D): string {
    const text = 'Fingerprint test 123';
    ctx.font = '12px Arial';
    const metrics = ctx.measureText(text);
    return `${metrics.width}_${metrics.actualBoundingBoxAscent}_${metrics.actualBoundingBoxDescent}`;
  }

  private async getWebRTCInfo() {
    try {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      const localIPs: string[] = [];
      
      return new Promise((resolve) => {
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            const candidate = event.candidate.candidate;
            const ip = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
            if (ip && !localIPs.includes(ip[1])) {
              localIPs.push(ip[1]);
            }
          }
        };
        
        pc.createDataChannel('test');
        pc.createOffer().then(offer => pc.setLocalDescription(offer));
        
        setTimeout(() => {
          pc.close();
          resolve({
            localIPs,
            candidateTypes: ['host', 'srflx', 'relay']
          });
        }, 1000);
      });
    } catch (e) {
      return { localIPs: [], candidateTypes: [] };
    }
  }

  private async detectFonts(): Promise<string[]> {
    const testFonts = [
      'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana',
      'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
      'Trebuchet MS', 'Arial Black', 'Impact'
    ];
    
    const detectedFonts: string[] = [];
    const baseFontSize = 72;
    
    for (const font of testFonts) {
      if (await this.isFontAvailable(font, baseFontSize)) {
        detectedFonts.push(font);
      }
    }
    
    return detectedFonts;
  }

  private async isFontAvailable(font: string, fontSize: number): Promise<boolean> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    const testString = 'mmmmmmmmmmlli';
    ctx.font = `${fontSize}px monospace`;
    const baseWidth = ctx.measureText(testString).width;
    
    ctx.font = `${fontSize}px ${font}, monospace`;
    const testWidth = ctx.measureText(testString).width;
    
    return baseWidth !== testWidth;
  }

  private getSpeechSynthesisVoices(): string[] {
    try {
      return speechSynthesis.getVoices().map(voice => voice.name);
    } catch (e) {
      return [];
    }
  }

  private async getMediaDevices(): Promise<string[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.map(device => `${device.kind}_${device.label || 'unknown'}`);
    } catch (e) {
      return [];
    }
  }

  private async checkPermissions(): Promise<Record<string, string>> {
    const permissions = ['camera', 'microphone', 'geolocation', 'notifications'];
    const results: Record<string, string> = {};
    
    for (const permission of permissions) {
      try {
        const result = await navigator.permissions.query({ name: permission as any });
        results[permission] = result.state;
      } catch (e) {
        results[permission] = 'unknown';
      }
    }
    
    return results;
  }

  private detectAutomation(): boolean {
    return !!(
      (window as any).phantom ||
      (window as any).callPhantom ||
      (window as any)._phantom ||
      (window as any).webdriver ||
      (navigator as any).webdriver ||
      (window as any).chrome?.runtime?.onConnect ||
      (window as any).document?.$cdc_asdjflasutopfhvcZLmcfl_
    );
  }

  private detectHeadless(): boolean {
    return !!(
      navigator.webdriver ||
      (window as any).outerHeight === 0 ||
      (window as any).outerWidth === 0 ||
      navigator.plugins.length === 0
    );
  }

  private detectWebDriver(): boolean {
    return !!(
      (navigator as any).webdriver ||
      (window as any).webdriver ||
      (window as any).document?.documentElement?.getAttribute('webdriver')
    );
  }
}

/**
 * Behavioral Data Collector
 */
class BehaviorCollector {
  private mouseMovements: MouseMovement[] = [];
  private keyboardEvents: KeyboardEvent[] = [];
  private clickPattern: ClickEvent[] = [];
  private scrollEvents: ScrollEvent[] = [];
  private focusEvents: FocusEvent[] = [];
  private resizeEvents: ResizeEvent[] = [];
  private touchEvents: TouchEvent[] = [];
  private idleTime = 0;
  private lastActivity = Date.now();
  private updateCallback?: (data: any) => void;

  start(callback: (data: any) => void) {
    this.updateCallback = callback;
    this.setupEventListeners();
    this.startIdleTimer();
  }

  stop() {
    this.removeEventListeners();
    this.updateCallback = undefined;
  }

  private setupEventListeners() {
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('click', this.handleClick.bind(this));
    document.addEventListener('scroll', this.handleScroll.bind(this));
    document.addEventListener('focus', this.handleFocus.bind(this));
    document.addEventListener('blur', this.handleBlur.bind(this));
    window.addEventListener('resize', this.handleResize.bind(this));
    document.addEventListener('touchstart', this.handleTouch.bind(this));
  }

  private removeEventListeners() {
    document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    document.removeEventListener('click', this.handleClick.bind(this));
    document.removeEventListener('scroll', this.handleScroll.bind(this));
    document.removeEventListener('focus', this.handleFocus.bind(this));
    document.removeEventListener('blur', this.handleBlur.bind(this));
    window.removeEventListener('resize', this.handleResize.bind(this));
    document.removeEventListener('touchstart', this.handleTouch.bind(this));
  }

  private handleMouseMove(event: Event) {
    const e = event as globalThis.MouseEvent;
    this.updateActivity();
    
    if (this.mouseMovements.length > 1000) {
      this.mouseMovements = this.mouseMovements.slice(-500);
    }
    
    this.mouseMovements.push({
      x: e.clientX,
      y: e.clientY,
      timestamp: Date.now()
    });
    
    this.notifyUpdate();
  }

  private handleKeyDown(event: Event) {
    const e = event as globalThis.KeyboardEvent;
    this.updateActivity();
    
    if (this.keyboardEvents.length > 500) {
      this.keyboardEvents = this.keyboardEvents.slice(-250);
    }
    
    this.keyboardEvents.push({
      key: e.key.length === 1 ? '*' : e.key, // Mask actual characters for privacy
      code: e.code,
      timestamp: Date.now(),
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      shiftKey: e.shiftKey,
      metaKey: e.metaKey
    });
    
    this.notifyUpdate();
  }

  private handleClick(event: Event) {
    const e = event as globalThis.MouseEvent;
    this.updateActivity();
    
    if (this.clickPattern.length > 100) {
      this.clickPattern = this.clickPattern.slice(-50);
    }
    
    this.clickPattern.push({
      x: e.clientX,
      y: e.clientY,
      timestamp: Date.now(),
      button: e.button,
      detail: e.detail
    });
    
    this.notifyUpdate();
  }

  private handleScroll(event: Event) {
    this.updateActivity();
    
    if (this.scrollEvents.length > 200) {
      this.scrollEvents = this.scrollEvents.slice(-100);
    }
    
    this.scrollEvents.push({
      x: window.scrollX,
      y: window.scrollY,
      timestamp: Date.now(),
      deltaX: 0,
      deltaY: 0
    });
    
    this.notifyUpdate();
  }

  private handleFocus() {
    this.updateActivity();
    this.focusEvents.push({
      type: 'focus',
      timestamp: Date.now(),
      target: 'window'
    });
    this.notifyUpdate();
  }

  private handleBlur() {
    this.focusEvents.push({
      type: 'blur',
      timestamp: Date.now(),
      target: 'window'
    });
    this.notifyUpdate();
  }

  private handleResize() {
    this.updateActivity();
    
    if (this.resizeEvents.length > 50) {
      this.resizeEvents = this.resizeEvents.slice(-25);
    }
    
    this.resizeEvents.push({
      width: window.innerWidth,
      height: window.innerHeight,
      timestamp: Date.now()
    });
    
    this.notifyUpdate();
  }

  private handleTouch(event: Event) {
    const e = event as globalThis.TouchEvent;
    this.updateActivity();
    
    if (e.touches.length > 0 && this.touchEvents.length < 500) {
      const touch = e.touches[0];
      this.touchEvents.push({
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now(),
        force: touch.force,
        radiusX: touch.radiusX,
        radiusY: touch.radiusY
      });
    }
    
    this.notifyUpdate();
  }

  private updateActivity() {
    this.lastActivity = Date.now();
    this.idleTime = 0;
  }

  private startIdleTimer() {
    setInterval(() => {
      const now = Date.now();
      if (now - this.lastActivity > 1000) {
        this.idleTime = now - this.lastActivity;
      }
    }, 1000);
  }

  private notifyUpdate() {
    if (this.updateCallback) {
      this.updateCallback({
        mouseMovements: this.mouseMovements,
        keyboardEvents: this.keyboardEvents,
        clickPattern: this.clickPattern,
        scrollEvents: this.scrollEvents,
        focusEvents: this.focusEvents,
        resizeEvents: this.resizeEvents,
        touchEvents: this.touchEvents,
        timeOnPage: Date.now(),
        idleTime: this.idleTime,
        suspiciousPatterns: this.detectSuspiciousPatterns()
      });
    }
  }

  private detectSuspiciousPatterns(): string[] {
    const patterns: string[] = [];
    
    // Check for robotic mouse movements
    if (this.mouseMovements.length > 10) {
      const recent = this.mouseMovements.slice(-10);
      const deltaX = recent.map((m, i) => i > 0 ? m.x - recent[i-1].x : 0);
      const deltaY = recent.map((m, i) => i > 0 ? m.y - recent[i-1].y : 0);
      
      const avgDeltaX = deltaX.reduce((a, b) => a + Math.abs(b), 0) / deltaX.length;
      const avgDeltaY = deltaY.reduce((a, b) => a + Math.abs(b), 0) / deltaY.length;
      
      if (avgDeltaX < 1 && avgDeltaY < 1) {
        patterns.push('minimal_mouse_movement');
      }
      
      // Check for perfectly linear movements
      const isLinear = deltaX.every(d => Math.abs(d) < 2) || deltaY.every(d => Math.abs(d) < 2);
      if (isLinear) {
        patterns.push('linear_mouse_movement');
      }
    }
    
    // Check for rapid identical keyboard events
    if (this.keyboardEvents.length > 5) {
      const recent = this.keyboardEvents.slice(-5);
      const intervals = recent.map((k, i) => i > 0 ? k.timestamp - recent[i-1].timestamp : 0);
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      
      if (avgInterval < 50) { // Less than 50ms between keystrokes
        patterns.push('rapid_keyboard_input');
      }
    }
    
    // Check for no human-like pauses
    if (this.idleTime === 0 && Date.now() - this.lastActivity > 30000) {
      patterns.push('no_idle_time');
    }
    
    return patterns;
  }
}

// Export singleton instance
export const enhancedFingerprintingService = new EnhancedFingerprintingService();
