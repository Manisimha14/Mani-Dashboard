import React from 'react';
import { useAppStore } from '../store/useAppStore';
import QuickLauncher from './QuickLauncher';
import Modal from './Modal';

export default function QuickLauncherModal() {
  const { launcher, updateLauncher } = useAppStore();

  return (
    <Modal
      open={launcher.launcherOpen}
      onClose={() => updateLauncher({ launcherOpen: false })}
      title="Application Launcher"
      maxWidth="max-w-2xl"
    >
      <div className="py-2">
        <QuickLauncher />
      </div>
    </Modal>
  );
}
