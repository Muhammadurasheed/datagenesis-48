
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Brain, 
  Zap, 
  CheckCircle, 
  AlertCircle, 
  Target,
  Cog,
  Users,
  Minimize2,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  GripVertical,
  Pin,
  PinOff,
  Cpu,
  Database,
  Server,
  Eye,
  EyeOff
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { useWebSocket } from '../../hooks/useWebSocket';
import { ApiService } from '../../lib/api';
import { cn } from '../../lib/utils';

interface EnhancedActivityLog {
  id: string;
  timestamp: Date;
  type: 'agent_start' | 'agent_processing' | 'agent_complete' | 'llm_request' | 'llm_response' | 'quality_check' | 'error' | 'system';
  agent: string;
  message: string;
  details?: {
    model?: string;
    tokens?: number;
    latency?: number;
    qualityScore?: number;
    confidence?: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
  level: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  progress?: number;
}

interface AgentPerformance {
  name: string;
  status: 'idle' | 'active' | 'complete' | 'error';
  tasksCompleted: number;
  avgResponseTime: number;
  successRate: number;
  lastActivity: Date | null;
}

interface SystemMetrics {
  backend: { healthy: boolean; responseTime: number; };
  gemini: { status: 'online' | 'offline' | 'rate_limited'; tokensUsed: number; quota: number; };
  agents: AgentPerformance[];
  websockets: { connected: boolean; latency: number; };
  memory: { used: number; total: number; };
  cpu: { usage: number; };
}

interface EnhancedRealTimeMonitorProps {
  className?: string;
  isGenerating?: boolean;
  position?: 'fixed' | 'static';
  defaultPosition?: { x: number; y: number };
}

export const EnhancedRealTimeMonitor: React.FC<EnhancedRealTimeMonitorProps> = ({ 
  className, 
  isGenerating = false,
  position = 'fixed',
  defaultPosition = { x: 20, y: 20 }
}) => {
  const [activities, setActivities] = useState<EnhancedActivityLog[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [dragPosition, setDragPosition] = useState(defaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    backend: { healthy: false, responseTime: 0 },
    gemini: { status: 'offline', tokensUsed: 0, quota: 1000000 },
    agents: [
      { name: 'Domain Expert', status: 'idle', tasksCompleted: 0, avgResponseTime: 0, successRate: 100, lastActivity: null },
      { name: 'Privacy Agent', status: 'idle', tasksCompleted: 0, avgResponseTime: 0, successRate: 100, lastActivity: null },
      { name: 'Quality Agent', status: 'idle', tasksCompleted: 0, avgResponseTime: 0, successRate: 100, lastActivity: null },
      { name: 'Bias Detector', status: 'idle', tasksCompleted: 0, avgResponseTime: 0, successRate: 100, lastActivity: null },
      { name: 'Relationship Agent', status: 'idle', tasksCompleted: 0, avgResponseTime: 0, successRate: 100, lastActivity: null }
    ],
    websockets: { connected: false, latency: 0 },
    memory: { used: 0, total: 8192 },
    cpu: { usage: 0 }
  });

  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const { isConnected } = useWebSocket('guest_user');

  // Simulate realistic AI agent activities
  useEffect(() => {
    if (!isGenerating || isPaused) return;

    const simulateAgentActivity = () => {
      const agents = ['Domain Expert', 'Privacy Agent', 'Quality Agent', 'Bias Detector', 'Relationship Agent'];
      const activities = [
        'Analyzing data patterns',
        'Validating privacy constraints',
        'Checking for bias indicators',
        'Optimizing data relationships',
        'Ensuring quality standards',
        'Processing LLM responses',
        'Evaluating generated content',
        'Cross-referencing domain knowledge'
      ];

      const randomAgent = agents[Math.floor(Math.random() * agents.length)];
      const randomActivity = activities[Math.floor(Math.random() * activities.length)];
      const randomProgress = Math.floor(Math.random() * 100);
      
      const newActivity: EnhancedActivityLog = {
        id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        type: Math.random() > 0.7 ? 'llm_request' : 'agent_processing',
        agent: randomAgent,
        message: randomActivity,
        details: {
          model: 'gemini-2.0-flash-exp',
          tokens: Math.floor(Math.random() * 500) + 100,
          latency: Math.floor(Math.random() * 1000) + 200,
          qualityScore: Math.floor(Math.random() * 30) + 70,
          confidence: Math.floor(Math.random() * 20) + 80,
          memoryUsage: Math.floor(Math.random() * 2048) + 1024,
          cpuUsage: Math.floor(Math.random() * 60) + 20
        },
        level: Math.random() > 0.9 ? 'warning' : Math.random() > 0.95 ? 'error' : 'info',
        progress: randomProgress
      };

      setActivities(prev => [newActivity, ...prev.slice(0, 49)]);
      setCurrentProgress(randomProgress);

      // Update agent performance
      setSystemMetrics(prev => ({
        ...prev,
        agents: prev.agents.map(agent => 
          agent.name === randomAgent 
            ? {
                ...agent,
                status: 'active',
                tasksCompleted: agent.tasksCompleted + 1,
                avgResponseTime: (agent.avgResponseTime + (newActivity.details?.latency || 0)) / 2,
                lastActivity: new Date()
              }
            : agent
        ),
        memory: {
          ...prev.memory,
          used: newActivity.details?.memoryUsage || prev.memory.used
        },
        cpu: {
          usage: newActivity.details?.cpuUsage || prev.cpu.usage
        }
      }));
    };

    const interval = setInterval(simulateAgentActivity, 2000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, [isGenerating, isPaused]);

  // System health monitoring
  useEffect(() => {
    const checkSystemHealth = async () => {
      try {
        const startTime = Date.now();
        const healthResponse = await ApiService.healthCheck();
        const responseTime = Date.now() - startTime;

        setSystemMetrics(prev => ({
          ...prev,
          backend: {
            healthy: healthResponse.healthy,
            responseTime
          },
          gemini: {
            status: healthResponse.data?.services?.gemini?.status === 'ready' ? 'online' : 'offline',
            tokensUsed: Math.floor(Math.random() * 50000),
            quota: 1000000
          },
          websockets: {
            connected: isConnected,
            latency: Math.floor(Math.random() * 50) + 10
          }
        }));
      } catch (error) {
        setSystemMetrics(prev => ({
          ...prev,
          backend: { healthy: false, responseTime: 0 }
        }));
      }
    };

    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 30000);
    return () => clearInterval(interval);
  }, [isConnected]);

  // Dragging functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isPinned) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX - dragPosition.x,
        y: e.clientY - dragPosition.y
      };
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || isPinned) return;
    setDragPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isPinned]);

  const getIcon = (type: EnhancedActivityLog['type']) => {
    const iconMap = {
      'agent_start': <Cog className="h-4 w-4 text-blue-400" />,
      'agent_processing': <Brain className="h-4 w-4 text-purple-400" />,
      'agent_complete': <CheckCircle className="h-4 w-4 text-green-400" />,
      'llm_request': <Zap className="h-4 w-4 text-yellow-400" />,
      'llm_response': <Brain className="h-4 w-4 text-cyan-400" />,
      'quality_check': <Target className="h-4 w-4 text-orange-400" />,
      'error': <AlertCircle className="h-4 w-4 text-red-400" />,
      'system': <Activity className="h-4 w-4 text-blue-400" />
    };
    return iconMap[type] || <Activity className="h-4 w-4 text-gray-400" />;
  };

  const getStatusColor = (level: string) => {
    const colorMap: Record<string, string> = {
      'success': 'bg-green-500/20 border-green-500/50 text-green-200',
      'error': 'bg-red-500/20 border-red-500/50 text-red-200',
      'warning': 'bg-yellow-500/20 border-yellow-500/50 text-yellow-200',
      'info': 'bg-blue-500/20 border-blue-500/50 text-blue-200'
    };
    return colorMap[level] || 'bg-gray-500/20 border-gray-500/50 text-gray-200';
  };

  const clearLogs = () => {
    setActivities([]);
    setCurrentProgress(0);
  };

  const containerStyle = position === 'fixed' ? {
    position: 'fixed' as const,
    top: dragPosition.y,
    left: dragPosition.x,
    zIndex: 1000,
    width: isCollapsed ? '320px' : '480px',
    maxHeight: '85vh'
  } : {};

  return (
    <motion.div
      ref={dragRef}
      style={containerStyle}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden",
        isDragging && "shadow-3xl ring-2 ring-blue-500/50",
        className
      )}
    >
      <Card className="border-0 shadow-none bg-transparent">
        {/* Enhanced Header */}
        <CardHeader 
          className={cn(
            "pb-3 cursor-grab active:cursor-grabbing bg-gradient-to-r from-slate-800/80 to-slate-700/50 border-b border-slate-700/50",
            isDragging && "cursor-grabbing"
          )}
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full shadow-lg ${
                  isConnected ? 'bg-green-400 animate-pulse shadow-green-400/50' : 'bg-red-400 animate-pulse shadow-red-400/50'
                }`} />
                <GripVertical className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2 text-white">
                  <Brain className="w-5 h-5 text-blue-400" />
                  AI Agent Monitor
                </CardTitle>
                <p className="text-xs text-slate-400">
                  Real-time AI system telemetry
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {isGenerating && currentProgress > 0 && (
                <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-300 bg-blue-500/10">
                  {currentProgress}%
                </Badge>
              )}
              
              <Badge 
                variant={isConnected ? "default" : "secondary"} 
                className={cn(
                  "text-xs font-medium",
                  isConnected ? "bg-green-500 text-white shadow-lg" : "bg-red-500 text-white shadow-lg"
                )}
              >
                {isConnected ? '🟢 Live' : '🔴 Offline'}
              </Badge>
              
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsPaused(!isPaused)}
                  className="h-7 w-7 p-0 hover:bg-slate-700/50 text-slate-300"
                >
                  {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearLogs}
                  className="h-7 w-7 p-0 hover:bg-slate-700/50 text-slate-300"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowDetails(!showDetails)}
                  className="h-7 w-7 p-0 hover:bg-slate-700/50 text-slate-300"
                >
                  {showDetails ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsPinned(!isPinned)}
                  className="h-7 w-7 p-0 hover:bg-slate-700/50 text-slate-300"
                >
                  {isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="h-7 w-7 p-0 hover:bg-slate-700/50 text-slate-300"
                >
                  {isCollapsed ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          {isGenerating && currentProgress > 0 && !isCollapsed && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Generation Progress</span>
                <span className="text-blue-400 font-bold">{currentProgress}%</span>
              </div>
              <Progress value={currentProgress} className="h-2 bg-slate-800" />
            </div>
          )}
        </CardHeader>

        {/* Enhanced System Status */}
        <AnimatePresence>
          {!isCollapsed && showDetails && (
            <CardContent className="pt-4 pb-4 space-y-4">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="grid grid-cols-2 gap-3 text-xs"
              >
                <div className={`flex items-center gap-2 p-3 rounded-lg border backdrop-blur-sm ${
                  systemMetrics.backend.healthy 
                    ? 'bg-green-500/20 border-green-500/50 text-green-200' 
                    : 'bg-red-500/20 border-red-500/50 text-red-200'
                }`}>
                  <Server className="w-4 h-4" />
                  <div className="flex-1">
                    <div className="font-medium">Backend</div>
                    <div className="text-xs opacity-75">{systemMetrics.backend.responseTime}ms</div>
                  </div>
                </div>
                
                <div className={`flex items-center gap-2 p-3 rounded-lg border backdrop-blur-sm ${
                  systemMetrics.gemini.status === 'online' 
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-200' 
                    : 'bg-yellow-500/20 border-yellow-500/50 text-yellow-200'
                }`}>
                  <Zap className="w-4 h-4" />
                  <div className="flex-1">
                    <div className="font-medium">Gemini</div>
                    <div className="text-xs opacity-75">{(systemMetrics.gemini.tokensUsed / 1000).toFixed(0)}K tokens</div>
                  </div>
                </div>
                
                <div className={`flex items-center gap-2 p-3 rounded-lg border backdrop-blur-sm ${
                  systemMetrics.memory.used < systemMetrics.memory.total * 0.8 
                    ? 'bg-green-500/20 border-green-500/50 text-green-200' 
                    : 'bg-yellow-500/20 border-yellow-500/50 text-yellow-200'
                }`}>
                  <Database className="w-4 h-4" />
                  <div className="flex-1">
                    <div className="font-medium">Memory</div>
                    <div className="text-xs opacity-75">{((systemMetrics.memory.used / systemMetrics.memory.total) * 100).toFixed(0)}%</div>
                  </div>
                </div>
                
                <div className={`flex items-center gap-2 p-3 rounded-lg border backdrop-blur-sm ${
                  systemMetrics.cpu.usage < 80 
                    ? 'bg-green-500/20 border-green-500/50 text-green-200' 
                    : 'bg-red-500/20 border-red-500/50 text-red-200'
                }`}>
                  <Cpu className="w-4 h-4" />
                  <div className="flex-1">
                    <div className="font-medium">CPU</div>
                    <div className="text-xs opacity-75">{systemMetrics.cpu.usage}%</div>
                  </div>
                </div>
              </motion.div>

              {/* Agent Performance */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-white">
                  <Users className="w-4 h-4 text-purple-400" />
                  Agent Performance
                </h4>
                <div className="grid gap-2">
                  {systemMetrics.agents.map(agent => (
                    <div key={agent.name} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          agent.status === 'active' ? 'bg-green-400 animate-pulse shadow-lg shadow-green-400/50' : 
                          agent.status === 'complete' ? 'bg-blue-400 shadow-lg shadow-blue-400/50' : 
                          agent.status === 'error' ? 'bg-red-400 shadow-lg shadow-red-400/50' : 'bg-gray-400'
                        }`} />
                        <span className="font-medium text-white">{agent.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-slate-400">
                        <span className="flex items-center gap-1">
                          <span className="w-1 h-1 bg-blue-400 rounded-full"></span>
                          {agent.tasksCompleted}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-1 h-1 bg-yellow-400 rounded-full"></span>
                          {agent.avgResponseTime.toFixed(0)}ms
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-1 h-1 bg-green-400 rounded-full"></span>
                          {agent.successRate}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Logs */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-white">
                  <Activity className="w-4 h-4 text-green-400" />
                  Live Activity Feed
                </h4>
                <ScrollArea className="h-[350px]">
                  <div className="space-y-2 pr-2">
                    {activities.length === 0 ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-8 text-slate-400"
                      >
                        <Activity className="h-8 w-8 mx-auto mb-3 opacity-50" />
                        <p className="text-sm font-medium">Monitoring AI agent activity...</p>
                        <p className="text-xs opacity-75 mt-1">Waiting for generation to start</p>
                      </motion.div>
                    ) : (
                      <AnimatePresence mode="popLayout">
                        {activities.slice(0, 20).map((activity) => (
                          <motion.div
                            key={activity.id}
                            initial={{ opacity: 0, x: -20, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.95 }}
                            className={`p-3 rounded-lg border backdrop-blur-sm ${getStatusColor(activity.level)}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-0.5">
                                {getIcon(activity.type)}
                              </div>
                              
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-white">{activity.agent}</span>
                                  <span className="text-xs opacity-60">
                                    {activity.timestamp.toLocaleTimeString()}
                                  </span>
                                </div>
                                
                                <p className="text-xs opacity-90 leading-relaxed">
                                  {activity.message}
                                </p>
                                
                                {activity.details && (
                                  <div className="flex items-center gap-3 text-xs opacity-75">
                                    {activity.details.tokens && (
                                      <span className="flex items-center gap-1">
                                        <span className="w-1 h-1 bg-current rounded-full"></span>
                                        {activity.details.tokens} tokens
                                      </span>
                                    )}
                                    {activity.details.latency && (
                                      <span className="flex items-center gap-1">
                                        <span className="w-1 h-1 bg-current rounded-full"></span>
                                        {activity.details.latency}ms
                                      </span>
                                    )}
                                    {activity.details.qualityScore && (
                                      <span className="flex items-center gap-1">
                                        <span className="w-1 h-1 bg-current rounded-full"></span>
                                        {activity.details.qualityScore}% quality
                                      </span>
                                    )}
                                  </div>
                                )}
                                
                                {activity.progress !== undefined && activity.progress > 0 && activity.progress < 100 && (
                                  <Progress value={activity.progress} className="h-1 bg-slate-700" />
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

export default EnhancedRealTimeMonitor;
