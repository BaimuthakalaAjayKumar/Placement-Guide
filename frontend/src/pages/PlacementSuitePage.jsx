import React from 'react';
import Header from '../components/Header';
import StudentPlacementSuite from '../components/StudentPlacementSuite';

const PlacementSuitePage = () => {
  return (
    <>
      <Header title="Placement Readiness & Preparation Suite" />
      <div className="content-wrapper animate-fade">
        <StudentPlacementSuite />
      </div>
    </>
  );
};

export default PlacementSuitePage;
