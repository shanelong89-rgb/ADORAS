/**
 * Advanced AI Features Component - Phase 4f
 * Provides access to memory summarization, semantic search, insights, and connections
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { 
  Sparkles, 
  Search, 
  Lightbulb, 
  Link2, 
  FileText, 
  Loader2,
  TrendingUp,
  Calendar,
  Users,
  Heart
} from 'lucide-react';
import { toast } from 'sonner';
import {
  summarizeMemories,
  semanticSearch,
  generateInsights,
  findConnectedMemories,
} from '../utils/aiService';
import { Memory } from '../App';

interface AdvancedAIFeaturesProps {
  memories: Memory[];
  onSelectMemory?: (memoryId: string) => void;
}

export function AdvancedAIFeatures({ memories, onSelectMemory }: AdvancedAIFeaturesProps) {
  // Summary state
  const [summaryType, setSummaryType] = useState<'brief' | 'detailed' | 'narrative'>('brief');
  const [summary, setSummary] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Insights state
  const [insightType, setInsightType] = useState<'patterns' | 'themes' | 'timeline' | 'relationships'>('patterns');
  const [insights, setInsights] = useState<any>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  // Connections state
  const [selectedMemoryId, setSelectedMemoryId] = useState<string>('');
  const [connectedMemories, setConnectedMemories] = useState<string[]>([]);
  const [isFindingConnections, setIsFindingConnections] = useState(false);

  // Generate summary
  const handleGenerateSummary = async () => {
    if (memories.length === 0) {
      toast.error('No memories to summarize');
      return;
    }

    setIsSummarizing(true);
    try {
      const result = await summarizeMemories({
        memories,
        summaryType,
      });

      setSummary(result.summary);
      toast.success('Summary generated!');
    } catch (error) {
      console.error('Failed to generate summary:', error);
      toast.error('Failed to generate summary');
    } finally {
      setIsSummarizing(false);
    }
  };

  // Perform semantic search
  const handleSemanticSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    if (memories.length === 0) {
      toast.error('No memories to search');
      return;
    }

    setIsSearching(true);
    try {
      const result = await semanticSearch({
        query: searchQuery,
        memories,
        limit: 10,
      });

      setSearchResults(result.results);
      toast.success(`Found ${result.results.length} results`);
    } catch (error) {
      console.error('Failed to search:', error);
      toast.error('Failed to perform search');
    } finally {
      setIsSearching(false);
    }
  };

  // Generate insights
  const handleGenerateInsights = async () => {
    if (memories.length === 0) {
      toast.error('No memories to analyze');
      return;
    }

    setIsGeneratingInsights(true);
    try {
      const result = await generateInsights({
        memories,
        insightType,
      });

      setInsights(result.insights);
      toast.success('Insights generated!');
    } catch (error) {
      console.error('Failed to generate insights:', error);
      toast.error('Failed to generate insights');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  // Find connected memories
  const handleFindConnections = async () => {
    if (!selectedMemoryId) {
      toast.error('Please select a memory');
      return;
    }

    setIsFindingConnections(true);
    try {
      const result = await findConnectedMemories({
        memoryId: selectedMemoryId,
        memories,
        limit: 5,
      });

      setConnectedMemories(result.connectedMemories);
      toast.success(`Found ${result.connectedMemories.length} connected memories`);
    } catch (error) {
      console.error('Failed to find connections:', error);
      toast.error('Failed to find connections');
    } finally {
      setIsFindingConnections(false);
    }
  };

  const getMemoryById = (id: string) => memories.find(m => m.id === id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-purple-600" />
        <h2 className="text-2xl font-bold">Advanced AI Features</h2>
        <Badge variant="secondary" className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 text-purple-700 dark:text-purple-300">
          Beta
        </Badge>
      </div>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary">
            <FileText className="w-4 h-4 mr-2" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="search">
            <Search className="w-4 h-4 mr-2" />
            Search
          </TabsTrigger>
          <TabsTrigger value="insights">
            <Lightbulb className="w-4 h-4 mr-2" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="connections">
            <Link2 className="w-4 h-4 mr-2" />
            Connections
          </TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Memory Summarization
              </CardTitle>
              <CardDescription>
                Generate AI-powered summaries of your memory collection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Summary Type</label>
                <Select value={summaryType} onValueChange={(v: any) => setSummaryType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brief">Brief (2-3 sentences)</SelectItem>
                    <SelectItem value="detailed">Detailed (1-2 paragraphs)</SelectItem>
                    <SelectItem value="narrative">Narrative Story</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleGenerateSummary}
                disabled={isSummarizing || memories.length === 0}
                className="w-full"
              >
                {isSummarizing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Summary
                  </>
                )}
              </Button>

              {summary && (
                <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{summary}</p>
                </div>
              )}

              {memories.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No memories to summarize. Start sharing memories to use this feature.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Semantic Search Tab */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Semantic Search
              </CardTitle>
              <CardDescription>
                Search memories by meaning, not just keywords
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., 'happy moments with family' or 'challenging times'"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSemanticSearch()}
                />
                <Button 
                  onClick={handleSemanticSearch}
                  disabled={isSearching || !searchQuery.trim()}
                >
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {searchResults.length > 0 && (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-2">
                    {searchResults.map((memoryId) => {
                      const memory = getMemoryById(memoryId);
                      if (!memory) return null;

                      return (
                        <Card 
                          key={memoryId}
                          className="cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => onSelectMemory?.(memoryId)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Badge variant="outline">{memory.type}</Badge>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm line-clamp-2">{memory.content}</p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {memory.tags?.slice(0, 3).map((tag, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}

              {memories.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No memories to search. Start sharing memories to use this feature.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Memory Insights
              </CardTitle>
              <CardDescription>
                Discover patterns and themes in your memories
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={insightType === 'patterns' ? 'default' : 'outline'}
                  onClick={() => setInsightType('patterns')}
                  className="justify-start"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Patterns
                </Button>
                <Button
                  variant={insightType === 'themes' ? 'default' : 'outline'}
                  onClick={() => setInsightType('themes')}
                  className="justify-start"
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Themes
                </Button>
                <Button
                  variant={insightType === 'timeline' ? 'default' : 'outline'}
                  onClick={() => setInsightType('timeline')}
                  className="justify-start"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Timeline
                </Button>
                <Button
                  variant={insightType === 'relationships' ? 'default' : 'outline'}
                  onClick={() => setInsightType('relationships')}
                  className="justify-start"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Relationships
                </Button>
              </div>

              <Button 
                onClick={handleGenerateInsights}
                disabled={isGeneratingInsights || memories.length === 0}
                className="w-full"
              >
                {isGeneratingInsights ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Insights
                  </>
                )}
              </Button>

              {insights && (
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="font-medium mb-2">Main Insight:</p>
                    <p className="text-sm">{insights.mainInsight}</p>
                  </div>

                  {insights.details && insights.details.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Details:</p>
                      <ul className="space-y-1">
                        {insights.details.map((detail: string, i: number) => (
                          <li key={i} className="text-sm text-muted-foreground pl-4 border-l-2 border-purple-300">
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {insights.suggestions && insights.suggestions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Suggestions:</p>
                      <ul className="space-y-1">
                        {insights.suggestions.map((suggestion: string, i: number) => (
                          <li key={i} className="text-sm text-muted-foreground pl-4 border-l-2 border-green-300">
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {memories.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No memories to analyze. Start sharing memories to use this feature.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Connections Tab */}
        <TabsContent value="connections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="w-5 h-5" />
                Memory Connections
              </CardTitle>
              <CardDescription>
                Discover memories that are related to each other
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select a memory:</label>
                <Select value={selectedMemoryId} onValueChange={setSelectedMemoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a memory..." />
                  </SelectTrigger>
                  <SelectContent>
                    {memories.slice(0, 50).map((memory) => (
                      <SelectItem key={memory.id} value={memory.id}>
                        {memory.content.substring(0, 50)}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleFindConnections}
                disabled={isFindingConnections || !selectedMemoryId}
                className="w-full"
              >
                {isFindingConnections ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Finding...
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4 mr-2" />
                    Find Connections
                  </>
                )}
              </Button>

              {connectedMemories.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Connected Memories:</p>
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-2">
                      {connectedMemories.map((memoryId) => {
                        const memory = getMemoryById(memoryId);
                        if (!memory) return null;

                        return (
                          <Card 
                            key={memoryId}
                            className="cursor-pointer hover:bg-accent/50 transition-colors"
                            onClick={() => onSelectMemory?.(memoryId)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <Badge variant="outline">{memory.type}</Badge>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm line-clamp-2">{memory.content}</p>
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {memory.tags?.slice(0, 3).map((tag, i) => (
                                      <Badge key={i} variant="secondary" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {memories.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No memories to connect. Start sharing memories to use this feature.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
