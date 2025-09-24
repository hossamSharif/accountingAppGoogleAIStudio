import React from 'react';

interface StatCardProps {
    title: string;
    value: string;
    // Fix: Changed JSX.Element to React.ReactElement to resolve namespace issue.
    icon: React.ReactElement;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => {
    return (
        <div className="bg-surface p-6 rounded-lg shadow-lg flex items-center space-x-4 space-x-reverse">
            <div className="bg-background p-3 rounded-full">
                {icon}
            </div>
            <div>
                <p className="text-text-secondary text-sm font-medium">{title}</p>
                <p className="text-2xl font-bold text-text-primary">{value}</p>
            </div>
        </div>
    );
};

export default StatCard;
