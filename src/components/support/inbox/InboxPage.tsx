"use client";

import { useState, useEffect } from "react";
import ConversationList from "@/components/support/inbox/ConversationList";
import ChatWorkspace from "@/components/support/inbox/ChatWorkspace";
import CustomerPanel from "@/components/support/inbox/CustomerPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { MessageSquare } from "lucide-react";

export default function UnifiedInboxPage() {
  const [activeConversation, setActiveConversation] = useState<any>(null);
  const [showMobileList, setShowMobileList] = useState(true);
  const [showCustomerPanel, setShowCustomerPanel] = useState(false);

  useEffect(() => {
    if (!showMobileList) {
      document.body.classList.add("mobile-chat-open");
    } else {
      document.body.classList.remove("mobile-chat-open");
    }
    return () => {
      document.body.classList.remove("mobile-chat-open");
    };
  }, [showMobileList]);

  const handleSelectConversation = (conv: any) => {
    setActiveConversation((prev: any) => {
      // Avoid state update if nothing changed
      if (prev && prev.id === conv.id && JSON.stringify(prev) === JSON.stringify(conv)) {
        return prev;
      }
      return conv;
    });
    setShowMobileList(false); // Hide list on mobile when a chat is selected
  };

  const handleBackToList = () => {
    setShowMobileList(true);
  };

  return (
    <div className="flex h-full w-full bg-white relative">
      {/* 1. Conversation List Sidebar */}
      <div 
        className={`w-full md:w-80 lg:w-[340px] flex-shrink-0 border-r border-slate-200 bg-white h-full flex flex-col transition-transform ${
          !showMobileList ? "hidden md:flex" : "flex"
        }`}
      >
        <ConversationList 
          onSelectConversation={handleSelectConversation} 
          activeId={activeConversation?.id} 
        />
      </div>

      {/* 2. Main Chat Workspace */}
      <div 
        className={`flex-1 flex flex-col min-w-0 bg-white h-full relative ${
          showMobileList && activeConversation ? "hidden md:flex" : (!showMobileList ? "flex" : "hidden md:flex")
        }`}
      >
        {activeConversation ? (
          <ChatWorkspace 
            conversation={activeConversation} 
            onBack={handleBackToList}
            onClose={() => {
              setActiveConversation(null);
              setShowMobileList(true);
            }}
            onTogglePanel={() => setShowCustomerPanel(!showCustomerPanel)}
            showPanelActive={showCustomerPanel}
          />
        ) : (
          <div className="flex items-center justify-center h-full p-8 bg-slate-50/30">
            <EmptyState 
              icon={MessageSquare}
              title="No conversation selected"
              description="Choose a conversation from the list to start chatting or view details."
            />
          </div>
        )}
      </div>

      {/* 3. Customer Info Panel */}
      {/* Desktop/Tablet Panel */}
      {activeConversation && (
        <div 
          className={`fixed inset-y-0 right-0 z-40 w-full sm:w-[340px] transform transition-transform duration-300 ease-in-out border-l border-slate-200 bg-white shadow-2xl xl:shadow-none xl:relative xl:translate-x-0 ${
            showCustomerPanel ? "translate-x-0" : "translate-x-full hidden xl:block"
          }`}
        >
          <CustomerPanel 
            conversation={activeConversation} 
            onClose={() => setShowCustomerPanel(false)}
          />
        </div>
      )}

      {/* Mobile/Tablet Backdrop for Customer Panel */}
      {showCustomerPanel && activeConversation && (
        <div 
          className="fixed inset-0 bg-slate-900/20 z-30 xl:hidden transition-opacity"
          onClick={() => setShowCustomerPanel(false)}
        />
      )}
    </div>
  );
}
