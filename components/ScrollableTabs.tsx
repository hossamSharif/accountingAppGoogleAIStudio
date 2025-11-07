import React, { useRef, useState, useEffect } from 'react';

export interface TabOption {
    id: string;
    label: string;
}

interface ScrollableTabsProps {
    tabs: TabOption[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
    className?: string;
}

const ScrollableTabs: React.FC<ScrollableTabsProps> = ({
    tabs,
    activeTab,
    onTabChange,
    className = ''
}) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showLeftShadow, setShowLeftShadow] = useState(false);
    const [showRightShadow, setShowRightShadow] = useState(false);

    // Check if content is scrollable and update shadow states
    const updateScrollShadows = () => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const { scrollLeft, scrollWidth, clientWidth } = container;
        const isRTL = document.dir === 'rtl' || document.documentElement.dir === 'rtl';

        if (isRTL) {
            // In RTL, scrollLeft is negative or starts from the right
            const maxScrollLeft = scrollWidth - clientWidth;
            const currentScroll = Math.abs(scrollLeft);

            setShowRightShadow(currentScroll > 10); // Show right shadow when scrolled
            setShowLeftShadow(currentScroll < maxScrollLeft - 10); // Show left shadow when can scroll more
        } else {
            // LTR behavior
            setShowLeftShadow(scrollLeft > 10);
            setShowRightShadow(scrollLeft < scrollWidth - clientWidth - 10);
        }
    };

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        // Initial check
        updateScrollShadows();

        // Listen for scroll events
        container.addEventListener('scroll', updateScrollShadows);

        // Listen for resize events
        window.addEventListener('resize', updateScrollShadows);

        return () => {
            container.removeEventListener('scroll', updateScrollShadows);
            window.removeEventListener('resize', updateScrollShadows);
        };
    }, [tabs]);

    // Scroll active tab into view
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const activeButton = container.querySelector(`[data-tab-id="${activeTab}"]`);
        if (activeButton) {
            activeButton.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }, [activeTab]);

    return (
        <div className={`relative ${className}`}>
            {/* Left shadow indicator (RTL: right side) */}
            {showLeftShadow && (
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-surface to-transparent pointer-events-none z-10 rtl:left-auto rtl:right-0 rtl:bg-gradient-to-l" />
            )}

            {/* Scrollable container */}
            <div
                ref={scrollContainerRef}
                className="overflow-x-auto overflow-y-hidden scrollbar-hide"
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                }}
            >
                <div className="flex gap-2 px-2 py-2 min-w-min">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            data-tab-id={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`
                                flex-shrink-0
                                min-h-[44px] px-6 py-2
                                rounded-md font-medium
                                transition-all duration-300
                                whitespace-nowrap
                                ${activeTab === tab.id
                                    ? 'bg-primary text-white shadow-lg'
                                    : 'text-text-secondary hover:bg-background hover:text-text-primary'
                                }
                            `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Right shadow indicator (RTL: left side) */}
            {showRightShadow && (
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-surface to-transparent pointer-events-none z-10 rtl:right-auto rtl:left-0 rtl:bg-gradient-to-r" />
            )}

            {/* Hide scrollbar styles */}
            <style>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};

export default ScrollableTabs;
