import styled from 'styled-components';
import { SettingsTile, TabBar } from '../../common';
import { useState } from 'react';
import { LocalImport } from '../../local';
import { ImageSettingsContent } from './ImageSettings';

const tabs: Record<string, React.ReactNode> = {
  images: <ImageSettingsContent />,
  local: <LocalImport />,
};

type Tab = keyof typeof tabs;

const TabSettingsTile = styled(SettingsTile)`
  & > legend {
    background: var(--card-background);
    padding: 0;
  }

  display: flex;
  justify-content: space-between;
  grid-column: 1 / -1;

  margin-bottom: 8px;
`;

export const ServiceSettings = () => {
  const [activeTab, setActiveTab] = useState<Tab>('images');

  return (
    <TabSettingsTile
      label={
        <TabBar
          tabs={[
            { id: 'images', content: 'Images' },
            { id: 'local', content: 'Import' },
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
