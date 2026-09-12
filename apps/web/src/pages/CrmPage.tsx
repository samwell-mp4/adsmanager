import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { BrowserProfile } from '../types/index.js';
import { CrmView } from '../views/CrmView.js';

export const CrmPage: React.FC = () => {
  const [profiles, setProfiles] = useState<BrowserProfile[]>([]);

  useEffect(() => {
    api.getProfiles().then((data) => setProfiles(data || [])).catch(() => {});
  }, []);

  const handleOpenVnc = (profile: BrowserProfile) => {
    if (!profile.novnc_port) {
      alert('Este perfil não está com o navegador aberto no momento. Inicie-o na lista de perfis para visualizar.');
      return;
    }
    const base = window.location;
    const url = `${base.protocol}//${base.host}/vnc/${profile.novnc_port}/vnc.html?autoconnect=true&resize=scale&path=vnc/${profile.novnc_port}/websockify`;
    window.open(url, '_blank');
  };

  return <CrmView profiles={profiles} onOpenVnc={handleOpenVnc} />;
};
