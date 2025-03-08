import React from 'react';
import { motion } from 'framer-motion';

export interface BotControlPanelProps {
  botName: string;
  botId: string;
  isRunning: boolean;
  isLoading?: boolean;
  onStart: () => void;
  onStop: () => void;
}

const BotControlPanel: React.FC<BotControlPanelProps> = ({
  botName,
  isRunning,
  isLoading = false,
  onStart,
  onStop
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">{botName}</h2>
        <div className="flex items-center">
          <span className={`inline-block w-3 h-3 rounded-full mr-2 ${isRunning ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {isRunning ? 'Running' : 'Stopped'}
          </span>
        </div>
      </div>
      
      <div className="flex space-x-4">
        <button
          onClick={onStart}
          disabled={isRunning || isLoading}
          className={`flex-1 py-2 px-4 rounded-md text-white font-medium transition-colors ${
            isRunning || isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Starting...
            </span>
          ) : (
            'Start Bot'
          )}
        </button>
        
        <button
          onClick={onStop}
          disabled={!isRunning || isLoading}
          className={`flex-1 py-2 px-4 rounded-md text-white font-medium transition-colors ${
            !isRunning || isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-red-500 hover:bg-red-600'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Stopping...
            </span>
          ) : (
            'Stop Bot'
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default BotControlPanel;
