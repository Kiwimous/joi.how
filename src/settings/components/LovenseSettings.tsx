import { useCallback, useState } from 'react';
import {
  Button,
  SettingsInfo,
  SettingsTile,
  SettingsDescription,
  Space,
  Surrounded,
  IconButton,
  TextInput,
  SettingsLabel,
  Spinner,
} from '../../common';
import {
  defaultTransition,
  useLovenseValue,
  LovenseClient,
  LovenseDevice,
  LovenseConnectionInfo,
  LovensePresets,
} from '../../utils';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGear, faWifi } from '@fortawesome/free-solid-svg-icons';
import { AnimatePresence, motion } from 'framer-motion';

const StyledDeviceList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const StyledDeviceItem = styled.li`
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  .device-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .device-name {
    font-weight: 500;
  }

  .device-status {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.875rem;
    color: ${props => (props.online ? '#4ade80' : '#f87171')};
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: currentColor;
  }
`;

const StyledQRCode = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  margin-top: 16px;

  img {
    border-radius: 8px;
    max-width: 200px;
  }

  .qr-instructions {
    text-align: center;
    font-size: 0.875rem;
    opacity: 0.8;
    max-width: 300px;
  }
`;

const StyledTokenInput = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
  margin-bottom: 16px;
`;

const StyledTestControls = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

export const LovenseSettings = () => {
  const [client, setClient] = useLovenseValue('client');
  const [token, setToken] = useLovenseValue('token');
  const [devices] = useLovenseValue('devices');
  const [connectionInfo, setConnectionInfo] = useLovenseValue('connectionInfo');
  const [error, setError] = useLovenseValue('error');
  const [qrCode, setQrCode] = useLovenseValue('qrCode');

  const [loading, setLoading] = useState(false);
  const [tokenInput, setTokenInput] = useState(token || '');
  const [expanded, setExpanded] = useState(false);
  const [testingDevice, setTestingDevice] = useState<string | null>(null);

  const initializeClient = useCallback(async () => {
    if (!tokenInput) {
      setError('Please enter your Lovense developer token');
      return;
    }

    setLoading(true);
    setError(undefined);

    try {
      const newClient = new LovenseClient(tokenInput);
      setClient(newClient);
      setToken(tokenInput);

      // Generate QR code for user to scan
      const qrCodeUrl = await newClient.getQRCode('user123', 'User');
      setQrCode(qrCodeUrl);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [tokenInput, setClient, setToken, setQrCode, setError]);

  const disconnect = useCallback(() => {
    if (client) {
      client.disconnect();
      setConnectionInfo(undefined);
      setQrCode(undefined);
    }
  }, [client, setConnectionInfo, setQrCode]);

  const testVibrate = useCallback(
    async (device: LovenseDevice) => {
      setTestingDevice(device.id);
      try {
        await device.vibrate(0.5); // 50% intensity
        setTimeout(async () => {
          await device.stop();
          setTestingDevice(null);
        }, 2000);
      } catch (e) {
        setError(String(e));
        setTestingDevice(null);
      }
    },
    [setError]
  );

  const testPreset = useCallback(
    async (device: LovenseDevice, preset: keyof typeof LovensePresets) => {
      setTestingDevice(device.id);
      try {
        await device.preset(LovensePresets[preset], 5); // 5 seconds
        setTestingDevice(null);
      } catch (e) {
        setError(String(e));
        setTestingDevice(null);
      }
    },
    [setError]
  );

  // Simulate receiving callback data (in real app, this would come from your server)
  const simulateCallback = useCallback(() => {
    if (!client) return;

    // Example callback data
    const mockData: LovenseConnectionInfo = {
      uid: 'user123',
      appVersion: '5.1.4',
      toys: {
        toy123: {
          id: 'toy123',
          name: 'lush',
          nickName: 'My Lush',
          status: 1 as 0 | 1,
        },
      },
      wssPort: '34568',
      httpPort: '34567',
      wsPort: '34567',
      appType: 'remote',
      domain: '192-168-1-44.lovense.club',
      utoken: 'xxxxx',
      httpsPort: '34568',
      version: '101',
      platform: 'android',
    };

    client.handleCallback(mockData);
    setConnectionInfo(mockData);
    setQrCode(undefined);
  }, [client, setConnectionInfo, setQrCode]);

  return (
    <>
      <SettingsTile
        name={
          <>
            <FontAwesomeIcon icon={faWifi} /> Lovense
          </>
        }
        action={
          <IconButton onClick={() => setExpanded(!expanded)}>
            <FontAwesomeIcon icon={faGear} />
          </IconButton>
        }
      >
        <SettingsDescription>
          Connect to Lovense toys using the Lovense Remote app
        </SettingsDescription>

        <Space />

        {!client && (
          <StyledTokenInput>
            <TextInput
              type='password'
              placeholder='Enter Lovense developer token'
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
            />
            <Button
              onClick={initializeClient}
              disabled={loading || !tokenInput}
            >
              {loading ? <Spinner size={16} /> : 'Initialize'}
            </Button>
          </StyledTokenInput>
        )}

        {client && !connectionInfo && qrCode && (
          <StyledQRCode>
            <img src={qrCode} alt='QR Code' />
            <div className='qr-instructions'>
              Scan this QR code with the Lovense Remote app to connect your toys
            </div>
            <Button onClick={simulateCallback} variant='secondary'>
              Simulate Connection (Dev Only)
            </Button>
          </StyledQRCode>
        )}

        {connectionInfo && (
          <>
            <SettingsInfo>
              <strong>Status:</strong>{' '}
              <span style={{ color: '#4ade80' }}>Connected</span>
            </SettingsInfo>

            <SettingsInfo>
              <strong>Platform:</strong> {connectionInfo.platform}
            </SettingsInfo>

            <SettingsInfo>
              <strong>App Version:</strong> {connectionInfo.appVersion}
            </SettingsInfo>

            <Space />

            <SettingsLabel>Connected Devices ({devices.length})</SettingsLabel>
            <StyledDeviceList>
              {devices.map(device => (
                <StyledDeviceItem key={device.id} online={device.isOnline}>
                  <div className='device-info'>
                    <div>
                      <div className='device-name'>{device.name}</div>
                      <div className='device-status'>
                        <span className='status-dot' />
                        {device.isOnline ? 'Online' : 'Offline'}
                      </div>
                    </div>
                  </div>
                  {device.isOnline && (
                    <StyledTestControls>
                      <Button
                        size='small'
                        onClick={() => testVibrate(device)}
                        disabled={testingDevice === device.id}
                      >
                        Test Vibrate
                      </Button>
                      <Button
                        size='small'
                        variant='secondary'
                        onClick={() => testPreset(device, 'PULSE')}
                        disabled={testingDevice === device.id}
                      >
                        Pulse
                      </Button>
                      <Button
                        size='small'
                        variant='secondary'
                        onClick={() => testPreset(device, 'WAVE')}
                        disabled={testingDevice === device.id}
                      >
                        Wave
                      </Button>
                    </StyledTestControls>
                  )}
                </StyledDeviceItem>
              ))}
            </StyledDeviceList>

            <Space />

            <Button onClick={disconnect} variant='danger'>
              Disconnect
            </Button>
          </>
        )}

        {error && (
          <SettingsInfo style={{ color: '#f87171' }}>
            Error: {error}
          </SettingsInfo>
        )}
      </SettingsTile>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={defaultTransition}
          >
            <Surrounded>
              <SettingsInfo>
                <strong>How to connect:</strong>
              </SettingsInfo>
              <SettingsInfo>
                1. Get a developer token from{' '}
                <a
                  href='https://www.lovense.com/user/developer/info'
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  Lovense Developer Dashboard
                </a>
              </SettingsInfo>
              <SettingsInfo>
                2. Enter your token and click Initialize
              </SettingsInfo>
              <SettingsInfo>
                3. Scan the QR code with Lovense Remote app
              </SettingsInfo>
              <SettingsInfo>
                4. Your toys will appear in the device list
              </SettingsInfo>
              <Space />
              <SettingsInfo>
                <strong>Note:</strong> Make sure your device and the Lovense
                Remote app are on the same network.
              </SettingsInfo>
            </Surrounded>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
