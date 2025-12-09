import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Zap, Edit, Minus, TrendingUp, Waves, GitCommit, Spline, RectangleHorizontal, MousePointer, Trash2, ChevronRight, ChevronLeft, Menu, Search, Settings } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const DrawingToolsModal = ({ isOpen, setIsOpen }) => {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('all');
    const [isMobile, setIsMobile] = useState(false);
    const [viewMode, setViewMode] = useState('categories');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) {
                setViewMode('categories');
            } else {
                setViewMode('content');
            }
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (isOpen) {
            if (isMobile) {
                setViewMode('categories');
            } else {
                setViewMode('content');
            }
            setSearchTerm('');
        }
    }, [isOpen, isMobile]);

    const tools = [
        { id: 'channel', label: 'Channel', icon: GitCommit, category: 'trend', description: 'Draw parallel trend lines' },
        { id: 'continuous', label: 'Continuous', icon: Spline, category: 'freehand', description: 'Freehand drawing' },
        { id: 'fib-fan', label: 'Fibonacci Fan', icon: Waves, category: 'fibonacci', description: 'Fibonacci trend lines' },
        { id: 'horizontal', label: 'Horizontal Line', icon: Minus, category: 'basic', description: 'Horizontal reference line' },
        { id: 'line', label: 'Line', icon: TrendingUp, category: 'basic', description: 'Straight line between two points' },
        { id: 'ray', label: 'Ray', icon: TrendingUp, category: 'basic', description: 'Line extending infinitely in one direction' },
        { id: 'rectangle', label: 'Rectangle', icon: RectangleHorizontal, category: 'shapes', description: 'Rectangle shape' },
        { id: 'trend', label: 'Trend Line', icon: TrendingUp, category: 'trend', description: 'Trend line with handles' },
        { id: 'vertical', label: 'Vertical Line', icon: Minus, category: 'basic', description: 'Vertical reference line' },
        { id: 'arrow', label: 'Arrow', icon: TrendingUp, category: 'markers', description: 'Directional arrow' },
        { id: 'text', label: 'Text', icon: Edit, category: 'markers', description: 'Add text annotation' },
        { id: 'ellipse', label: 'Ellipse', icon: RectangleHorizontal, category: 'shapes', description: 'Ellipse or circle' },
        { id: 'polygon', label: 'Polygon', icon: Spline, category: 'shapes', description: 'Multi-sided shape' },
    ];

    const categories = [
        { id: 'all', label: 'All Tools', icon: Edit, color: 'bg-blue-500' },
        { id: 'basic', label: 'Basic', icon: TrendingUp, color: 'bg-green-500' },
        { id: 'trend', label: 'Trend', icon: Waves, color: 'bg-purple-500' },
        { id: 'fibonacci', label: 'Fibonacci', icon: Waves, color: 'bg-orange-500' },
        { id: 'shapes', label: 'Shapes', icon: RectangleHorizontal, color: 'bg-pink-500' },
        { id: 'markers', label: 'Markers', icon: Edit, color: 'bg-red-500' },
        { id: 'freehand', label: 'Freehand', icon: Spline, color: 'bg-cyan-500' },
    ];

    const filteredTools = tools.filter(tool =>
        tool.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchTerm.toLowerCase())
    ).filter(tool =>
        activeTab === 'all' || tool.category === activeTab
    );

    const handleToolClick = (toolLabel) => {
        setIsOpen(false);
    };

    const handleCategorySelect = (categoryId) => {
        setActiveTab(categoryId);
        if (isMobile) {
            setViewMode('content');
        }
    };

    const handleBackToCategories = () => {
        setViewMode('categories');
        setSearchTerm('');
    };

    const currentCategory = categories.find(cat => cat.id === activeTab);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="w-full max-w-[95vw] md:max-w-6xl h-[95vh] md:h-[80vh] flex flex-col p-0 overflow-hidden">
                {/* Header */}
                <DialogHeader className="flex-shrink-0 border-b bg-white">
                    <div className="flex items-center justify-between px-3 py-3 md:px-4 md:py-4">
                        <div className="flex items-center gap-2 min-w-0">
                            {isMobile && viewMode === 'content' && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 flex-shrink-0"
                                    onClick={handleBackToCategories}
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                            )}
                            <DialogTitle className="text-base md:text-lg truncate">
                                {isMobile ? (
                                    viewMode === 'categories' ? 'Drawing Tools' : currentCategory?.label || 'Tools'
                                ) : 'Drawing Tools'}
                            </DialogTitle>
                        </div>

                        {/*<Button*/}
                        {/*    variant="ghost"*/}
                        {/*    size="icon"*/}
                        {/*    onClick={() => setIsOpen(false)}*/}
                        {/*    className="h-9 w-9 flex-shrink-0"*/}
                        {/*>*/}
                        {/*    <X className="h-5 w-5" />*/}
                        {/*</Button>*/}
                    </div>

                    {/* Mobile Search in Header (Content Mode) */}
                    {isMobile && viewMode === 'content' && (
                        <div className="px-3 pb-3 border-t pt-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    placeholder={`Search ${currentCategory?.label?.toLowerCase() || 'tools'}...`}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 pr-3 w-full h-10 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    )}
                </DialogHeader>

                <div className="flex flex-1 overflow-hidden min-h-0">
                    {/* Desktop Sidebar */}
                    {!isMobile && (
                        <div className="w-52 bg-gray-50 border-r flex-shrink-0 overflow-hidden flex flex-col">
                            <div className="p-4 pb-2 flex-shrink-0">
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Categories</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto px-2 pb-2">
                                <div className="space-y-1">
                                    {categories.map((cat) => {
                                        const count = cat.id === 'all' ? tools.length : tools.filter(tool => tool.category === cat.id).length;
                                        return (
                                            <button
                                                key={cat.id}
                                                onClick={() => setActiveTab(cat.id)}
                                                className={`w-full flex items-center p-3 rounded-lg text-left transition-all ${
                                                    activeTab === cat.id
                                                        ? 'bg-white border border-gray-200 shadow-sm'
                                                        : 'hover:bg-gray-100 text-gray-600'
                                                }`}
                                            >
                                                <div className={`h-8 w-8 rounded-lg ${cat.color} flex items-center justify-center mr-3 flex-shrink-0`}>
                                                    <cat.icon className="h-4 w-4 text-white" />
                                                </div>
                                                <span className="text-sm font-medium flex-1 truncate">{cat.label}</span>
                                                <span className={`text-xs rounded-full px-2 py-0.5 ml-2 flex-shrink-0 ${
                                                    activeTab === cat.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'
                                                }`}>
                          {count}
                        </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Mobile Categories View */}
                    {isMobile && viewMode === 'categories' && (
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-4">
                                <div className="grid grid-cols-2 gap-3">
                                    {categories.map((cat) => {
                                        const count = cat.id === 'all' ? tools.length : tools.filter(tool => tool.category === cat.id).length;
                                        return (
                                            <button
                                                key={cat.id}
                                                onClick={() => handleCategorySelect(cat.id)}
                                                className="flex flex-col items-center p-5 bg-white border-2 rounded-xl hover:border-blue-300 hover:shadow-md transition-all active:scale-95 min-h-[140px]"
                                            >
                                                <div className={`h-14 w-14 rounded-xl ${cat.color} flex items-center justify-center mb-3 shadow-sm`}>
                                                    <cat.icon className="h-7 w-7 text-white" />
                                                </div>
                                                <span className="font-semibold text-sm text-center mb-1">{cat.label}</span>
                                                <span className="text-xs text-gray-500 font-medium">{count} tools</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Content View (Mobile & Desktop) */}
                    {(viewMode === 'content' || !isMobile) && (
                        <div className="flex-1 overflow-hidden flex flex-col min-w-0">
                            {/* Desktop Search Header */}
                            {!isMobile && (
                                <div className="p-4 border-b flex-shrink-0">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            placeholder={`Search ${currentCategory?.label?.toLowerCase() || 'all'} tools...`}
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10 pr-4 w-full h-10 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Mobile Category Info Header */}
                            {isMobile && (
                                <div className="px-4 py-3 border-b bg-gray-50 flex-shrink-0">
                                    <div className="flex items-center">
                                        <div className={`h-12 w-12 rounded-xl ${currentCategory?.color || 'bg-blue-500'} flex items-center justify-center mr-3 shadow-sm flex-shrink-0`}>
                                            {currentCategory?.icon && React.createElement(currentCategory.icon, {
                                                className: "h-6 w-6 text-white"
                                            })}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-base truncate">{currentCategory?.label || 'All Tools'}</h3>
                                            <p className="text-xs text-gray-600">
                                                {filteredTools.length} of {activeTab === 'all' ? tools.length : tools.filter(t => t.category === activeTab).length} tools
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tools Grid */}
                            <div className="flex-1 overflow-y-auto">
                                {filteredTools.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center px-6 py-8">
                                        <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                            <Search className="h-10 w-10 text-gray-400" />
                                        </div>
                                        <p className="font-semibold text-base mb-2">No Tools Found</p>
                                        <p className="text-sm text-gray-500 mb-6 max-w-xs">
                                            {searchTerm ? `No tools found for "${searchTerm}"` : `No tools in ${currentCategory?.label?.toLowerCase() || 'this category'}`}
                                        </p>
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            {searchTerm && (
                                                <Button
                                                    size="default"
                                                    variant="outline"
                                                    onClick={() => setSearchTerm('')}
                                                >
                                                    Clear Search
                                                </Button>
                                            )}
                                            {isMobile && (
                                                <Button
                                                    size="default"
                                                    onClick={handleBackToCategories}
                                                >
                                                    Change Category
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-3 md:p-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                                            {filteredTools.map(tool => {
                                                const Icon = tool.icon;
                                                return (
                                                    <button
                                                        key={tool.id}
                                                        onClick={() => handleToolClick(tool.label)}
                                                        className="flex flex-col p-4 md:p-5 bg-white border-2 rounded-xl hover:border-blue-300 hover:shadow-md transition-all active:scale-95 text-left group"
                                                    >
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div className="h-11 w-11 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                                                <Icon className="h-6 w-6 text-blue-600" />
                                                            </div>
                                                            <div className="text-xs px-2.5 py-1 bg-gray-100 rounded-md capitalize font-medium text-gray-600">
                                                                {tool.category}
                                                            </div>
                                                        </div>
                                                        <h4 className="font-semibold text-sm md:text-base mb-2">{tool.label}</h4>
                                                        <p className="text-xs md:text-sm text-gray-500 flex-1 leading-relaxed">{tool.description}</p>
                                                        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                              <span className="text-xs md:text-sm text-blue-600 font-semibold group-hover:text-blue-700">
                                Select Tool
                              </span>
                                                            <div className="h-7 w-7 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                                                <ChevronRight className="h-4 w-4 text-blue-600" />
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default DrawingToolsModal;