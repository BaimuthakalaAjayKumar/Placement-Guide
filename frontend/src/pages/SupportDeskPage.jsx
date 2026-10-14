import React from 'react';
import Header from '../components/Header';
import SupportDeskManager from '../components/SupportDeskManager';

const SupportDeskPage = () => {
  return (
    <>
      <Header title="Campus Support Desk & Arrival Corrections" />
      <div className="content-wrapper animate-fade">
        <SupportDeskManager />
      </div>
    </>
  );
};

export default SupportDeskPage;
