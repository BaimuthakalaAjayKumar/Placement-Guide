import React from 'react';
import CampusBridgeAIAgent from './CampusBridgeAIAgent';

/**
 * Chatbot backwards-compatibility wrapper.
 * Re-exports the context-aware CampusBridgeAIAgent.
 */
const Chatbot = (props) => {
  return <CampusBridgeAIAgent {...props} />;
};

export default Chatbot;
