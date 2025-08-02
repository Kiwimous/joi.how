import axios from 'axios';
import { createStateProvider } from './state';

export interface LovenseToy {
  id: string;
  name: string;
  nickName?: string;
  status: 0 | 1; // 0: offline, 1: online
}

export interface LovenseConnectionInfo {
  uid: string;
  appVersion: string;
  toys: Record<string, LovenseToy>;
  wssPort: string;
  httpPort: string;
  wsPort: string;
  appType: string;
  domain: string;
  utoken: string;
  httpsPort: string;
  version: string;
  platform: string;
}

export interface LovenseCommand {
  command: string;
  action?: string;
  name?: string;
  rule?: string;
  timeSec?: number;
  loopRunningSec?: number;
  loopPauseSec?: number;
  toy?: string;
  stopPrevious?: number;
  apiVer?: number;
}

export enum LovenseAction {
  Vibrate = 'Vibrate',
  Rotate = 'Rotate',
  Pump = 'Pump',
  Stop = 'Stop',
}

export enum LovensePreset {
  PULSE = 'pulse',
  WAVE = 'wave',
  FIREWORKS = 'fireworks',
  EARTHQUAKE = 'earthquake',
}

export interface LovenseResponse {
  code: number;
  message?: string;
  result?: boolean;
  type?: string;
}

export class LovenseDevice {
  private commandId = 0;

  constructor(
    private readonly toy: LovenseToy,
    private readonly connectionInfo: LovenseConnectionInfo
  ) {}

  private get baseUrl(): string {
    const { domain, httpsPort } = this.connectionInfo;
    return `https://${domain}:${httpsPort}`;
  }

  private async sendCommand(command: LovenseCommand): Promise<LovenseResponse> {
    ++this.commandId;
    try {
      const response = await axios.post<LovenseResponse>(
        `${this.baseUrl}/command`,
        {
          ...command,
          toy: this.toy.id,
          apiVer: 1,
        },
        {
          timeout: 5000,
          // For browser environment, we might need to handle CORS
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Lovense command error:', error);
      throw error;
    }
  }

  async vibrate(intensity: number): Promise<void> {
    // Lovense uses 0-20 scale for vibration
    const scaledIntensity = Math.round(intensity * 20);
    await this.sendCommand({
      command: 'Function',
      action: `${LovenseAction.Vibrate}:${scaledIntensity}`,
      timeSec: 0, // 0 means indefinite
      stopPrevious: 1,
    });
  }

  async rotate(intensity: number): Promise<void> {
    const scaledIntensity = Math.round(intensity * 20);
    await this.sendCommand({
      command: 'Function',
      action: `${LovenseAction.Rotate}:${scaledIntensity}`,
      timeSec: 0,
      stopPrevious: 1,
    });
  }

  async pump(intensity: number): Promise<void> {
    // Pump uses 0-3 scale
    const scaledIntensity = Math.round(intensity * 3);
    await this.sendCommand({
      command: 'Function',
      action: `${LovenseAction.Pump}:${scaledIntensity}`,
      timeSec: 0,
      stopPrevious: 1,
    });
  }

  async stop(): Promise<void> {
    await this.sendCommand({
      command: 'Function',
      action: LovenseAction.Stop,
    });
  }

  async preset(preset: LovensePreset, timeSec: number = 10): Promise<void> {
    await this.sendCommand({
      command: 'Preset',
      name: preset,
      timeSec,
    });
  }

  async pattern(pattern: string, timeSec: number = 10): Promise<void> {
    // Pattern format: "V:1;F:v,r,p;S:1000#"
    // V: version, F: functions (vibrate,rotate,pump), S: interval in ms
    await this.sendCommand({
      command: 'Pattern',
      rule: pattern,
      timeSec,
    });
  }

  get name(): string {
    return this.toy.nickName || this.toy.name;
  }

  get id(): string {
    return this.toy.id;
  }

  get isOnline(): boolean {
    return this.toy.status === 1;
  }
}

export class LovenseClient {
  private token: string;
  private devices: Map<string, LovenseDevice> = new Map();
  private connectionInfo?: LovenseConnectionInfo;

  constructor(token: string) {
    this.token = token;
  }

  async getQRCode(userId: string, userName: string): Promise<string> {
    try {
      const response = await axios.post<{
        result: boolean;
        code: number;
        message: string;
      }>('https://api.lovense.com/api/lan/getQrCode', {
        token: this.token,
        uid: userId,
        uname: userName,
        utoken: this.generateUserToken(userId),
      });

      if (response.data.result && response.data.code === 200) {
        return response.data.message; // QR code image URL
      }
      throw new Error(response.data.message || 'Failed to get QR code');
    } catch (error) {
      console.error('Get QR code error:', error);
      throw error;
    }
  }

  private generateUserToken(userId: string): string {
    // Simple hash for user verification - in production use proper crypto
    // Using btoa for browser compatibility
    return btoa(userId + 'salt');
  }

  handleCallback(data: LovenseConnectionInfo): void {
    this.connectionInfo = data;
    this.devices.clear();

    // Create device instances for all connected toys
    Object.entries(data.toys).forEach(([id, toy]) => {
      this.devices.set(id, new LovenseDevice(toy, data));
    });
  }

  getDevices(): LovenseDevice[] {
    return Array.from(this.devices.values());
  }

  getDevice(id: string): LovenseDevice | undefined {
    return this.devices.get(id);
  }

  async commandByServer(
    userIds: string[],
    command: string,
    action?: string,
    timeSec?: number
  ): Promise<void> {
    // Server API for remote control when LAN connection is not available
    try {
      const response = await axios.post<{
        code: number;
        message?: string;
      }>('https://api.lovense.com/api/lan/v2/command', {
        token: this.token,
        uid: userIds.join(','),
        command,
        action,
        timeSec,
        apiVer: 2,
      });

      if (response.data.code !== 200) {
        throw new Error(response.data.message || 'Server command failed');
      }
    } catch (error) {
      console.error('Server command error:', error);
      throw error;
    }
  }

  get isConnected(): boolean {
    return !!this.connectionInfo;
  }

  disconnect(): void {
    this.devices.clear();
    this.connectionInfo = undefined;
  }
}

export interface LovenseSettings {
  client?: LovenseClient;
  token?: string;
  devices: LovenseDevice[];
  connectionInfo?: LovenseConnectionInfo;
  error?: string;
  qrCode?: string;
}

export const {
  Provider: LovenseProvider,
  useProvider: useLovense,
  useProviderSelector: useLovenseValue,
} = createStateProvider<LovenseSettings>({
  defaultData: {
    devices: [],
  },
});

// Export presets for easier usage
export const LovensePresets = {
  PULSE: LovensePreset.PULSE,
  WAVE: LovensePreset.WAVE,
  FIREWORKS: LovensePreset.FIREWORKS,
  EARTHQUAKE: LovensePreset.EARTHQUAKE,
};
