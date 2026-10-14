import React from 'react';
import Header from '../components/Header';
import FrontOfficeSecurityManager from '../components/FrontOfficeSecurityManager';

const FrontOfficePage = ({ defaultTab = 'overview' }) => {
  return (
    <>
      <Header title="Front Office & Security Operations" />
      <div className="content-wrapper animate-fade">
        <FrontOfficeSecurityManager defaultTab={defaultTab} />
      </div>
    </>
  );
};

export default FrontOfficePage;
