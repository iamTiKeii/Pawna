import React from "react";
import { createPortal } from "react-dom";

interface ContractDetailLayoutProps {
  header: React.ReactNode;
  actionBar?: React.ReactNode;
  statsCards?: React.ReactNode;
  summaryGrid?: React.ReactNode;
  infoSections?: React.ReactNode;
  tabs?: React.ReactNode;
  tabContent?: React.ReactNode;
  auditInfo?: React.ReactNode;
  isModal?: boolean;
}

export const ContractDetailLayout: React.FC<ContractDetailLayoutProps> = ({
  header,
  actionBar,
  statsCards,
  summaryGrid,
  infoSections,
  tabs,
  tabContent,
  auditInfo,
  isModal = false,
}) => {
  const content = (
    <div className="space-y-5 text-[15px]">
      {/* Header Section */}
      {!isModal && header}

      {/* Modal Specific Header */}
      {isModal && header}

      {/* Action Bar */}
      {actionBar}

      {/* Stats Cards */}
      {statsCards}

      {/* Summary Grid */}
      {summaryGrid}

      {/* Sections */}
      {infoSections}

      {/* Tabs list & content */}
      {tabs && (
        <div className="space-y-4">
          {tabs}
          {tabContent && (
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 min-h-[300px]">
              {tabContent}
            </div>
          )}
        </div>
      )}

      {/* Audit Logs */}
      {auditInfo}
    </div>
  );

  if (isModal) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
        <div
          className="modal-box bg-white border border-slate-200 text-slate-800 rounded-2xl w-11/12 max-w-[1320px] max-h-[95vh] overflow-y-auto p-6 relative"
          style={{ zoom: 1.02 }}
        >
          {content}
        </div>
      </div>,
      document.body
    );
  }

  return <div className="space-y-5">{content}</div>;
};
