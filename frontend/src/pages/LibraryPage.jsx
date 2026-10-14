import React from 'react';
import Header from '../components/Header';
import PhysicalLibraryManager from '../components/PhysicalLibraryManager';

const LibraryPage = () => {
  return (
    <>
      <Header title="Physical Library & Resource Management" />
      <div className="content-wrapper animate-fade">
        <PhysicalLibraryManager />
      </div>
    </>
  );
};

export default LibraryPage;
