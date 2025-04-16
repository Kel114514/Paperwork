import React, { useState, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Progress } from './ui/progress';
import { FiBook, FiTrendingUp, FiAward, FiCpu, FiTarget, FiZap, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { generateAIKnowledgeInsightsAPI } from './backendHandler';

export default function KnowledgeStats() {
  const [userAbilityLevel] = useLocalStorage('userAbilityLevel', 5);
  const [userKnowledgeAreas] = useLocalStorage('userKnowledgeAreas', {});
  const [userUnderstanding] = useLocalStorage('userUnderstanding', {});
  const [activeTab, setActiveTab] = useState('insights');
  const [domainAnalysis, setDomainAnalysis] = useState(null);
  const [strengthsWeaknesses, setStrengthsWeaknesses] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [learningPath, setLearningPath] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Maximum values for ability level and domain knowledge
  const MAX_ABILITY_LEVEL = 8; // Cap at 8/10
  const MAX_DOMAIN_SCORE = 80; // Cap at 80%
  
  // Get top knowledge areas by interaction count
  const topAreas = Object.entries(userKnowledgeAreas)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 5);
  
  // Get areas by understanding level
  const areasByUnderstanding = Object.entries(userKnowledgeAreas)
    .sort(([, a], [, b]) => b.understanding - a.understanding)
    .slice(0, 5);
  
  // Analyze user understanding data to extract domain knowledge
  useEffect(() => {
    if (Object.keys(userUnderstanding).length > 0 || Object.keys(userKnowledgeAreas).length > 0) {
      analyzeUnderstandingData();
      fetchAIInsights();
    } else {
      // Set default empty states
      setAiInsights({
        strengths: [],
        weaknesses: []
      });
      setLearningPath({
        title: "Beginner's Path to AI & ML",
        steps: [
          "Start with basic Python programming",
          "Learn fundamental statistics concepts",
          "Explore introductory machine learning courses"
        ]
      });
    }
  }, [userUnderstanding, userKnowledgeAreas, userAbilityLevel]);
  
  const analyzeUnderstandingData = () => {
    // Group concepts by domain
    const domains = {
      'Machine Learning': { concepts: [], score: 0 },
      'Computer Vision': { concepts: [], score: 0 },
      'Natural Language Processing': { concepts: [], score: 0 },
      'Deep Learning': { concepts: [], score: 0 },
      'Reinforcement Learning': { concepts: [], score: 0 },
      'Other': { concepts: [], score: 0 }
    };
    
    // Map understanding levels to numeric scores
    const levelScores = {
      'No Idea': 0,
      'Heard of It': 1,
      'Somewhat Understand': 2,
      'Fully Understand': 3
    };
    
    // Domain classification rules (simplified)
    const domainKeywords = {
      'Machine Learning': ['algorithm', 'model', 'feature', 'classification', 'regression', 'clustering', 'svm', 'random forest'],
      'Computer Vision': ['image', 'vision', 'cnn', 'convolutional', 'object detection', 'segmentation', 'recognition'],
      'Natural Language Processing': ['nlp', 'language', 'text', 'transformer', 'bert', 'gpt', 'token', 'embedding'],
      'Deep Learning': ['neural network', 'deep', 'backpropagation', 'gradient descent', 'activation', 'layer'],
      'Reinforcement Learning': ['reinforcement', 'reward', 'policy', 'agent', 'environment', 'q-learning']
    };
    
    // Classify concepts into domains
    Object.entries(userUnderstanding).forEach(([concept, level]) => {
      let assigned = false;
      
      for (const [domain, keywords] of Object.entries(domainKeywords)) {
        if (keywords.some(keyword => concept.toLowerCase().includes(keyword))) {
          domains[domain].concepts.push({ concept, level });
          domains[domain].score += levelScores[level] || 0;
          assigned = true;
          break;
        }
      }
      
      if (!assigned) {
        domains['Other'].concepts.push({ concept, level });
        domains['Other'].score += levelScores[level] || 0;
      }
    });
    
    // Also classify knowledge areas
    Object.entries(userKnowledgeAreas).forEach(([topic, data]) => {
      let assigned = false;
      
      for (const [domain, keywords] of Object.entries(domainKeywords)) {
        if (keywords.some(keyword => topic.toLowerCase().includes(keyword))) {
          if (!domains[domain].knowledgeAreas) {
            domains[domain].knowledgeAreas = [];
          }
          domains[domain].knowledgeAreas.push({ topic, data });
          domains[domain].score += (data.understanding / 10) * 3; // Normalize to same scale
          assigned = true;
          break;
        }
      }
      
      if (!assigned) {
        if (!domains['Other'].knowledgeAreas) {
          domains['Other'].knowledgeAreas = [];
        }
        domains['Other'].knowledgeAreas.push({ topic, data });
        domains['Other'].score += (data.understanding / 10) * 3;
      }
    });
    
    // Calculate average scores and normalize
    Object.keys(domains).forEach(domain => {
      const conceptCount = (domains[domain].concepts?.length || 0) + (domains[domain].knowledgeAreas?.length || 0);
      if (conceptCount > 0) {
        // Normalize to percentage and cap at MAX_DOMAIN_SCORE
        domains[domain].score = Math.min(
          (domains[domain].score / (conceptCount * 3)) * 100,
          MAX_DOMAIN_SCORE
        );
      }
    });
    
    // Remove empty domains
    const filteredDomains = Object.entries(domains)
      .filter(([_, data]) => (data.concepts?.length > 0) || (data.knowledgeAreas?.length > 0))
      .sort((a, b) => b[1].score - a[1].score);
    
    setDomainAnalysis(filteredDomains);
  };
  
  // Fetch AI-powered insights
  const fetchAIInsights = async () => {
    setIsLoading(true);
    
    // Prepare user profile data for the AI
    const userProfile = {
      abilityLevel: Math.min(userAbilityLevel, MAX_ABILITY_LEVEL), // Cap ability level
      understanding: userUnderstanding,
      knowledgeAreas: userKnowledgeAreas,
      domainAnalysis: domainAnalysis
    };
    
    try {
      // Call the API to get AI-generated insights
      const response = await generateAIKnowledgeInsightsAPI(userProfile);
      
      // Update state with the AI-generated insights
      setAiInsights({
        strengths: response.strengths || [],
        weaknesses: response.weaknesses || []
      });
      
      // Update learning path
      setLearningPath(response.learningPath || {
        title: "Personalized Learning Path",
        steps: ["Continue interacting with papers to receive a customized learning path."]
      });
    } catch (error) {
      console.error("Error fetching AI insights:", error);
      // Set fallback values
      setAiInsights({
        strengths: ["Continue interacting with papers to reveal your strengths."],
        weaknesses: ["More interactions needed to identify areas for improvement."]
      });
      setLearningPath({
        title: "Personalized Learning Path",
        steps: ["Continue interacting with papers to receive a customized learning path."]
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Component to render AI insights
  const AIInsightsCard = () => {
    return (
      <div className="mt-4 bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex items-center mb-3">
          <FiCpu className="text-blue-500 mr-2" />
          <h4 className="text-sm font-medium text-gray-900">AI-Powered Insights</h4>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h5 className="text-xs font-medium text-green-600 mb-2 flex items-center">
                <FiCheckCircle className="mr-1" /> Your Strengths
              </h5>
              {aiInsights && aiInsights.strengths.length > 0 ? (
                <ul className="text-xs space-y-1">
                  {aiInsights.strengths.slice(0, 3).map((item, i) => (
                    <li key={i} className="justify-between font-inter font-normal text-color-text-grey">{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-500">Continue interacting with papers to reveal your strengths.</p>
              )}
            </div>
            
            <div>
              <h5 className="text-xs font-medium text-amber-600 mb-2 flex items-center">
                <FiAlertCircle className="mr-1" /> Areas to Focus On
              </h5>
              {aiInsights && aiInsights.weaknesses.length > 0 ? (
                <ul className="text-xs space-y-1">
                  {aiInsights.weaknesses.slice(0, 3).map((item, i) => (
                    <li key={i} className="justify-between font-inter font-normal text-color-text-grey">{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-500">More interactions needed to identify areas for improvement.</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Component to render learning path
  const LearningPathCard = () => {
    return (
      <div className="mt-4 bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex items-center mb-3">
          <FiTarget className="text-blue-500 mr-2" />
          <h4 className="text-sm font-medium text-gray-900">Suggested Learning Path</h4>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {learningPath && learningPath.steps && learningPath.steps.length > 0 ? (
              <>
                <h5 className="text-xs font-medium text-gray-700 mb-2">{learningPath.title}</h5>
                <ul className="text-xs space-y-1 list-disc list-inside">
                  {learningPath.steps.map((step, i) => (
                    <li key={i} className="justify-between font-inter font-normal text-color-text-grey">{step}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-gray-500">Continue interacting with papers to receive a customized learning path.</p>
            )}
          </>
        )}
      </div>
    );
  };
  
  // Component to render fan chart
  const FanChart = ({ data, title, icon: Icon }) => {
    return (
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <div className="flex items-center mb-3">
          <Icon className="text-blue-500 mr-2" />
          <h4 className="text-sm font-medium text-gray-900">{title}</h4>
        </div>
        
        <div className="space-y-3">
          {data.map(([domain, info]) => (
            <div key={domain} className="space-y-1">
              <div className="flex justify-between">
                <span className="text-xs font-medium">{domain}</span>
                <span className="text-xs text-gray-500">{Math.round(info.score)}%</span>
              </div>
              <Progress value={info.score} />
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div className="no-scrollbar w-full h-[90vh] font-inter font-medium bg-white rounded-lg border border-gray-200 shadow-sm p-6 overflow-y-auto"
        style={{ boxShadow: '0 3px 3px rgb(0, 0, 0, 0.12)' }}
    >
      <div className="mb-4">
        <h3 className="text-base font-medium text-gray-900">Knowledge Profile</h3>
        <p className="text-sm text-gray-500">Your learning progress and expertise areas</p>
      </div>
      
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium">Overall Ability Level</span>
          <span className="text-sm font-medium">{Math.min(userAbilityLevel, MAX_ABILITY_LEVEL)}/10</span>
        </div>
        <Progress value={Math.min(userAbilityLevel * 10, MAX_DOMAIN_SCORE)} />
      </div>
      
      {/* Domain Knowledge Fan Chart - Always visible */}
      {domainAnalysis && domainAnalysis.length > 0 ? (
        <FanChart 
          data={domainAnalysis}
          title="Domain Knowledge Distribution" 
          icon={FiBook}
        />
      ) : (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <FiBook className="text-blue-500 mr-2" />
            <h4 className="text-sm font-medium text-gray-900">Domain Knowledge Distribution</h4>
          </div>
          <p className="text-sm text-gray-500">Start interacting with papers to build your domain knowledge profile.</p>
        </div>
      )}
      
      <div className="border-b my-4">
        <div className="flex mb-2">
          <button 
            className={`px-4 py-2 text-sm ${activeTab === 'insights' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('insights')}
          >
            <div className="flex items-center">
              <FiCpu className="mr-1.5" />
              AI Insights
            </div>
          </button>
          <button 
            className={`px-4 py-2 text-sm ${activeTab === 'learning' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('learning')}
          >
            <div className="flex items-center">
              <FiTarget className="mr-1.5" />
              Learning Path
            </div>
          </button>
        </div>
      </div>
      
      {/* Tab content */}
      {activeTab === 'insights' ? (
        <AIInsightsCard />
      ) : (
        <LearningPathCard />
      )}
    </div>
  );
} 