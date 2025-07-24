import styled from 'styled-components';
import { SettingsTile, TabBar } from '../../common';
import { useState } from 'react';
import { WalltakerSearch } from '../../walltaker';
import { LocalImport } from '../../local';

const tabs: Record<string, React.ReactNode> = {
  walltaker: <WalltakerSearch />,
  local: <LocalImport />,
};

type Tab = keyof typeof tabs;

const TabSettingsTile = styled(SettingsTile)`
  & > legend {
    background: var(--card-background);
    padding: 0;
  }
`;

export const ServiceSettings = () => {
  const [activeTab, setActiveTab] = useState<Tab>('e621');

  return (
    <TabSettingsTile
      label={
        <TabBar
          tabs={[
            // { id: 'walltaker', content: 'Walltaker' },
            { id: 'local', content: 'Device' },
          ]}
          current={activeTab}
          onChange={setActiveTab}
        />
      }
    >
      {tabs[activeTab]}
    </TabSettingsTile>
  );
};
