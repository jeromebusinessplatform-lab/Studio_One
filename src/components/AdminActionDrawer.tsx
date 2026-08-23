import React from 'react';
import { Trash2, FolderCog, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminActionDrawerProps {
  isVisible: boolean;
  selectedCount: number;
  onDelete: () => void;
  onUpdateCategory: () => void;
  onExport: () => void;
  onClose: () => void;
}

export const AdminActionDrawer: React.FC<AdminActionDrawerProps> = ({
  isVisible,
  selectedCount,
  onDelete,
  onUpdateCategory,
  onExport,
  onClose,
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 p-4 shadow-lg flex justify-between items-center z-50"
        >
          <span className="text-sm font-semibold text-neutral-800">
            {selectedCount} item(s) selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={onUpdateCategory}
              className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-xs font-medium text-neutral-800"
            >
              <FolderCog size={16} /> Category
            </button>
            <button
              onClick={onExport}
              className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-xs font-medium text-neutral-800"
            >
              <Download size={16} /> Export
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-xs font-medium text-red-800"
            >
              <Trash2 size={16} /> Delete
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
