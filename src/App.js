import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Home, Calendar, BookOpen, DollarSign, BrainCircuit, User, Info, Send, CalendarPlus, Mic, Sun, Moon } from 'lucide-react';
import { useTenant } from './contexts/TenantContext';
import { useAuth } from './contexts/AuthContext'; 
import axios from 'axios';
import { getTenantSisConfiguration, SisService } from './sis/services/schedule.service';
import LoginPage from './components/LoginPage';
import ThemeToggleButton from './components/ThemeToggleButton'; // Import the new component

// --- Dynamic Content URL Generation ---
const AZURE_STORAGE_BASE_URL = 'https://ststudentassistantsdb01.blob.core.windows.net';

const TENANT_CONTENT_CONFIG = {
    'joyce_uni_id': {
        containerName: 'joyce-uni-public-content',
        contentMap: {
            'financial-aid': 'financial_aid.json'
        }
    }
};

const getContentUrl = (tenantId, contentType) => {
    const tenantConfig = TENANT_CONTENT_CONFIG[tenantId];
    if (!tenantConfig) return null;
    const fileName = tenantConfig.contentMap[contentType];
    if (!fileName) return null;
    return `${AZURE_STORAGE_BASE_URL}/${tenantConfig.containerName}/${fileName}`;
};

// --- API Fetching Functions ---
const fetchScheduleAPI = async (tenantId, studentId) => {
    console.log(`Fetching schedule for tenant: ${tenantId}, student: ${studentId}`);
    if (!tenantId || !studentId) {
        console.warn("fetchScheduleAPI called without required IDs.");
        return [];
    }
    try {
        const tenantConfig = await getTenantSisConfiguration(tenantId);
        const sisService = new SisService(tenantConfig);
        return await sisService.getSchedulesForStudent(studentId, 'FALL2024');
    } catch (error) {
        console.error(`Error in fetchScheduleAPI:`, error);
        return [];
    }
};

const fetchAwardsAPI = async (tenantId, studentId) => {
    console.log(`Fetching awards for tenant: ${tenantId}, student: ${studentId}`);
    if (!tenantId || !studentId) {
        console.warn("fetchAwardsAPI called without required IDs.");
        return [];
    }
    try {
        const tenantConfig = await getTenantSisConfiguration(tenantId);
        const sisService = new SisService(tenantConfig);
        return await sisService.getAwardsForStudent(studentId);
    } catch (error) {
        console.error(`Error in fetchAwardsAPI:`, error);
        return [];
    }
};

const fetchAppointmentsAPI = async (tenantId) => {
    console.log(`Fetching appointments for tenant: ${tenantId}`);
    if (!tenantId) {
        console.warn("fetchAppointmentsAPI called without tenantId.");
        return [];
    }
    try {
        const tenantConfig = await getTenantSisConfiguration(tenantId);
        const sisService = new SisService(tenantConfig);
        return await sisService.getAppointmentsForTenant(tenantId);
    } catch (error) {
        console.error("Error fetching appointments: ", error);
        return [];
    }
};

// --- SKILL REGISTRY ---
const skills = [
    { name: 'schedule_assistant', keywords: ['schedule', 'class', 'when is', 'where is', 'who teaches', 'my next'], getSystemPrompt: (context) => `You are a helpful schedule assistant. Using the provided JSON data, answer the student's question about their class schedule. Be concise and clear. Here is the schedule: ${context.scheduleString}` },
    { name: 'financial_awards_assistant', keywords: ['my award', 'my fund', 'my aid package', 'my scholarship', 'my grant', 'my loan', 'awards received', 'funds received', 'scholarships received', 'grants received', 'loans received', 'my financial aid', 'my financial assistance', 'my balance', 'my financial aid package', 'my current awards', 'what I received', 'this year', 'last year', 'current year', 'previous year', 'federal', 'state', 'institutional', 'disbursed', 'pending', 'offered', 'awarded'], getSystemPrompt: (context) => `You are a helpful financial awards assistant. Using the provided JSON data, answer the student's question about their personal financial awards. Be specific and clear. When asked for a total amount for a specific type of aid (e.g., "how much scholarship have I received?"), you MUST calculate the sum of the 'amount' field for all awards of that 'type'. Provide the total, not just a list of the individual awards. Here is the student's award data: ${context.awardsString}` },
    { name: 'appointment_assistant', keywords: ['appointment', 'book', 'coach', 'success coach', 'schedule meeting', 'advisor meeting'], getSystemPrompt: (context) => `You are an appointment booking assistant. Inform the user about available appointment slots based on the provided data. Encourage them to use the 'Book Appointment' tab to finalize their booking. Here are the available slots: ${context.appointmentsString}` },
    { name: 'academic_tutor', keywords: ['explain', 'what is', 'how does', 'concept', 'theory', 'problem'], getSystemPrompt: () => 'You are an expert academic tutor. Provide a clear, helpful, and encouraging explanation for the following question.' },
    { name: 'financial_aid_advisor', keywords: ['financial aid', 'fafsa', 'loan', 'scholarship', 'grant', 'tuition', 'available', 'apply', 'eligibility', 'types of', 'financial assistance', 'aid programs', 'how to get', 'requirements for'], getSystemPrompt: (context) => { const financialAidContent = context.financialAidContent || 'No specific financial aid information is available.'; return `You are a knowledgeable university financial aid advisor. Answer the student's question accurately using the following information if relevant: \n\nFinancial Aid Page Content: "${financialAidContent}"\n\nIf the answer cannot be found in the provided source text, you must state, 'I cannot answer this question based on the provided document.'`; } },
    { name: 'default_assistant', keywords: [], getSystemPrompt: () => 'You are a friendly and helpful general-purpose student assistant. Engage in conversation and answer the user\'s question to the best of your ability.' }
];

// --- SKILL DISPATCHER ---
const selectSkill = (userInput, conversationHistory = []) => {
    const lowerInput = userInput.toLowerCase();
    for (const skill of skills) {
        if (skill.name === 'default_assistant') continue;
        for (const keyword of skill.keywords) {
            if (lowerInput.includes(keyword)) return skill;
        }
    }
    const fullConversationText = [...conversationHistory.map(m => m.text), userInput].join(' ').toLowerCase();
    for (const skill of skills) {
        if (skill.name === 'default_assistant') continue;
        for (const keyword of skill.keywords) {
            if (fullConversationText.includes(keyword)) return skill;
        }
    }
    return skills.find(s => s.name === 'default_assistant');
};

// --- MAIN APP COMPONENT ---
export default function App() {
    const { tenantId, loading: tenantLoading } = useTenant();
    const { isAuthenticated, currentUser, isLoading: authLoading } = useAuth();
    const [activeTab, setActiveTab] = useState('assistant');
    
    useEffect(() => {
        const displayTenantName = (() => {
            if (!tenantId) return '';
            if (tenantId === 'joyce_uni_id') return 'Joyce';
            if (tenantId.endsWith('_uni_id')) {
                const baseName = tenantId.replace('_uni_id', '');
                return baseName.charAt(0).toUpperCase() + baseName.slice(1);
            }
            return tenantId.charAt(0).toUpperCase() + tenantId.slice(1);
        })();

        if (!tenantLoading) {
            document.title = displayTenantName ? `${displayTenantName} Student Assistant` : 'Student Assistant';
        }
    }, [tenantId, tenantLoading]);

    const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
    const studentIdFromUrl = urlParams.get('studentId');
    const studentIdForApi = currentUser?.studentId || studentIdFromUrl;

    const headerTenantName = useMemo(() => {
        if (!tenantId) return '';
        if (tenantId === 'joyce_uni_id') return 'Joyce';
        if (tenantId.endsWith('_uni_id')) {
            const baseName = tenantId.replace('_uni_id', '');
            return baseName.charAt(0).toUpperCase() + baseName.slice(1);
        }
        return tenantId.charAt(0).toUpperCase() + tenantId.slice(1);
    }, [tenantId]);

    if (tenantLoading || authLoading) {
        return <div className="flex items-center justify-center min-h-screen text-slate-500 dark:text-slate-400"><LoadingSpinner message="Initializing Assistant..." /></div>;
    }

    if (!isAuthenticated && !studentIdFromUrl) {
        return <LoginPage />;
    }

    return (
        <div className="bg-slate-100 dark:bg-dark-background min-h-screen font-sans text-slate-800 dark:text-dark-foreground flex flex-col">
            <div className="container mx-auto p-4 max-w-7xl flex-grow flex flex-col">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-slate-300 dark:border-slate-700">
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{headerTenantName ? `${headerTenantName} Student Assistant` : 'Student Assistant'}</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Your personal AI agent for academic success.</p>
                    </div>
                    <div className="mt-4 sm:mt-0">
                        <ThemeToggleButton />
                    </div>
                </header>
                <div className="flex flex-col lg:flex-row gap-6 flex-grow">
                    <nav className="flex lg:flex-col lg:w-64 space-x-2 lg:space-x-0 lg:space-y-2 overflow-x-auto pb-2">
                        <NavButton icon={<BrainCircuit />} label="Assistant" activeTab={activeTab} onClick={() => setActiveTab('assistant')} />
                        <NavButton icon={<Calendar />} label="Full Schedule" activeTab={activeTab} customId="schedule" onClick={() => setActiveTab('schedule')} />
                        <NavButton icon={<DollarSign />} label="My Awards" activeTab={activeTab} customId="awards" onClick={() => setActiveTab('awards')} />
                        <NavButton icon={<CalendarPlus />} label="Book Appointment" activeTab={activeTab} customId="appointment" onClick={() => setActiveTab('appointment')} />
                    </nav>
                    <main className="flex-1 flex flex-col">
                         {activeTab === 'schedule' ? (
                            <ClassSchedule tenantId={tenantId} studentId={studentIdForApi} />
                        ) : activeTab === 'awards' ? (
                            <FinancialAwards tenantId={tenantId} studentId={studentIdForApi} />
                        ) : activeTab === 'appointment' ? (
                            <BookAppointment tenantId={tenantId} studentId={studentIdForApi} />
                        ) : (
                            <AgenticChatView studentId={studentIdForApi} />
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}

// --- Navigation Button Component ---
const NavButton = ({ icon, label, activeTab, onClick, customId }) => {
    const id = customId || label.toLowerCase();
    return (
        <button
            onClick={onClick}
            className={`flex items-center space-x-3 p-3 w-full text-left rounded-lg transition-all duration-200 text-sm sm:text-base font-medium whitespace-nowrap ${activeTab === id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>
            {React.cloneElement(icon, { className: 'h-5 w-5' })}
            <span>{label}</span>
        </button>
    );
};

// --- Agentic Chat View ---
const AgenticChatView = ({ studentId }) => {
    const { tenantId } = useTenant();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState(''); 
    const inputRef = useRef('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingSkillData, setIsFetchingSkillData] = useState(false);
    const [speechError, setSpeechError] = useState(null);
    const recognitionRef = useRef(null);
    const [isListening, setIsListening] = useState(false);
    const chatEndRef = useRef(null);
    
    const historyKey = useMemo(() => tenantId && studentId ? `chatHistory_${tenantId}_${studentId}` : null, [tenantId, studentId]);

    // Speech Recognition Setup
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setSpeechError('Speech recognition is not supported by your browser.');
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event) => {
            console.error(`Speech recognition error:`, event.error);
            setSpeechError(`Speech recognition error: ${event.error}`);
        };
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.trim();
            if (transcript) {
                handleSendMessage(transcript);
            }
        };

        recognitionRef.current = recognition;
        return () => { recognitionRef.current?.stop(); };
    }, []);

    // Load/Save chat history
    useEffect(() => {
        if (historyKey) {
            try {
                const savedHistory = localStorage.getItem(historyKey);
                if (savedHistory) setMessages(JSON.parse(savedHistory));
                else setMessages([{ role: 'assistant', text: `Hello! I'm your student assistant. How can I help you today?` }]);
            } catch (e) {
                setMessages([{ role: 'assistant', text: `Hello! I'm your student assistant. How can I help you today?` }]);
            }
        }
    }, [historyKey]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (historyKey && messages.length > 0) {
            const savableMessages = messages.filter(msg => msg.role !== 'system_ui');
            localStorage.setItem(historyKey, JSON.stringify(savableMessages));
        }
    }, [messages, historyKey]);
    
    // Main logic handler
    useEffect(() => {
        const processQuery = async () => {
            const lastMessage = messages[messages.length - 1];
            if (!lastMessage || lastMessage.role !== 'user') {
                return;
            }

            const chosenSkill = selectSkill(lastMessage.text, messages);
            
            let contextSchedule = [], contextAwards = [], contextAppointments = [], contextFinancialAid = '';

            try {
                setIsFetchingSkillData(true);
                if (chosenSkill.name === 'schedule_assistant') {
                    contextSchedule = await fetchScheduleAPI(tenantId, studentId);
                } else if (chosenSkill.name === 'financial_awards_assistant') {
                    contextAwards = await fetchAwardsAPI(tenantId, studentId);
                } else if (chosenSkill.name === 'appointment_assistant') {
                    contextAppointments = await fetchAppointmentsAPI(tenantId);
                } else if (chosenSkill.name === 'financial_aid_advisor' && tenantId) {
                    const url = getContentUrl(tenantId, 'financial-aid');
                    if (url) contextFinancialAid = (await axios.get(url)).data.content;
                }
            } catch (dataFetchError) {
                setMessages(prev => [...prev, { role: 'assistant', text: `Sorry, I couldn't retrieve the necessary data.` }]);
                return;
            } finally {
                setIsFetchingSkillData(false);
            }

            const context = {
                scheduleString: contextSchedule.length > 0 ? JSON.stringify(contextSchedule, null, 2) : "The student's schedule is currently empty.",
                awardsString: contextAwards.length > 0 ? JSON.stringify(contextAwards, null, 2) : "The student has no financial awards on file.",
                appointmentsString: contextAppointments.length > 0 ? JSON.stringify(contextAppointments, null, 2) : "There are currently no appointments available.",
                financialAidContent: contextFinancialAid || "Could not retrieve specific financial aid information."
            };

            const systemPrompt = chosenSkill.getSystemPrompt(context);
            
            try {
                setIsLoading(true);
                const historyForApi = messages.filter(msg => msg.role !== 'system_ui');
                const chatHistory = historyForApi.map(msg => ({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.text }] }));

                const payload = {
                    contents: chatHistory,
                    system_instruction: { parts: [{ text: systemPrompt }] }
                };
                const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

                const res = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (!res.ok) throw new Error(`API request failed with status ${res.status}`);
                
                const result = await res.json();
                if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
                    setMessages(prev => [...prev, { role: 'assistant', text: result.candidates[0].content.parts[0].text }]);
                } else {
                    if (result.promptFeedback?.blockReason) throw new Error(`Request was blocked: ${result.promptFeedback.blockReason}`);
                    throw new Error("Invalid or empty response from API.");
                }
            } catch (e) {
                setMessages(prev => [...prev, { role: 'assistant', text: `Sorry, I encountered an error: ${e.message}` }]);
            } finally {
                setIsLoading(false);
            }

            if (chosenSkill.name === 'appointment_assistant') {
                setMessages(prev => [...prev, { role: 'system_ui', type: 'inline_appointment_booking', data: contextAppointments, studentId, addMessage: (msg) => setMessages(p => [...p, msg]) }]);
            }
        };

        processQuery();

    }, [messages, tenantId, studentId]);


    const toggleListen = () => {
        if (!recognitionRef.current || isLoading || isFetchingSkillData) return;
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            setInput('');
            inputRef.current = '';
            setSpeechError(null);
            recognitionRef.current.start();
        }
    };
    
    const handleSendMessage = (textFromSpeech = null) => {
        const textToSend = textFromSpeech || inputRef.current.trim();
        if (!textToSend) return;
        
        setMessages(prev => [...prev, { role: 'user', text: textToSend }]);

        setInput('');
        inputRef.current = '';
    };
    
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-lg shadow-md">
            <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                {messages.map((msg, index) => <ChatMessage key={index} message={{...msg, studentId}} />)}
                {(isLoading || isFetchingSkillData) && <LoadingSpinner message={isFetchingSkillData ? "Fetching data..." : "Thinking..."} />}
                <div ref={chatEndRef} />
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                <div className="relative">
                    <textarea value={input} onChange={(e) => { setInput(e.target.value); inputRef.current = e.target.value; }} onKeyPress={handleKeyPress} placeholder="Ask me anything or click the mic to speak..." className="w-full h-12 p-3 pr-24 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-none" disabled={isLoading || isFetchingSkillData}/>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                        <button onClick={toggleListen} disabled={!recognitionRef.current || isLoading || isFetchingSkillData} className={`p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 transition ${isListening ? 'text-red-500 animate-pulse' : ''} disabled:opacity-50 disabled:cursor-not-allowed`} title={isListening ? "Stop listening" : "Start listening"} >
                            <Mic className="h-5 w-5" />
                        </button>
                        <button onClick={() => handleSendMessage()} disabled={isLoading || isFetchingSkillData || !input.trim()} className="ml-1 p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition">
                            <Send className="h-5 w-5" />
                        </button>
                    </div>
                </div>
                {speechError && <p className="text-xs text-red-500 text-center mt-1">{speechError}</p>}
            </div>
            <div className="flex justify-end p-4">
                <button onClick={() => { if (historyKey) localStorage.removeItem(historyKey); setMessages([{ role: 'assistant', text: `History cleared! How can I help you now?` }]); }} className="px-4 py-2 text-sm font-medium text-red-600 bg-red-100 rounded-lg hover:bg-red-200 dark:bg-red-800 dark:text-red-100 dark:hover:bg-red-700 transition">
                    Clear Chat History
                </button>
            </div>
        </div>
    );
};

// --- Child Components (Simplified for Tabs) ---

const ClassSchedule = ({ tenantId, studentId }) => {
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetchScheduleAPI(tenantId, studentId)
            .then(data => {
                const sortedData = [...data].sort((a, b) => {
                    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
                    if (dayOrder.indexOf(a.day) !== dayOrder.indexOf(b.day)) return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
                    return a.time.localeCompare(b.time);
                });
                setSchedule(sortedData);
            })
            .finally(() => setLoading(false));
    }, [tenantId, studentId]);

    if (loading) return <LoadingSpinner message="Loading your schedule..." />;

    return (
        <div className="p-1 sm:p-6 bg-white dark:bg-slate-800 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">My Full Class Schedule</h2>
            {schedule.length === 0 ? (
                <EmptyState icon={Info} title="No Classes Found" message="Your schedule could not be loaded or is empty." />
            ) : (
                <div className="space-y-4">{schedule.map(cls => (
                    <div key={cls.id} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border-l-4 border-blue-500 shadow-sm"><div className="flex flex-col sm:flex-row justify-between"><div><p className="font-bold text-lg text-slate-800 dark:text-slate-100">{cls.courseName} ({cls.courseCode})</p><p className="text-sm text-slate-600 dark:text-slate-300">Instructor: {cls.instructor}</p></div><div className="text-left sm:text-right mt-2 sm:mt-0"><p className="font-semibold text-slate-700 dark:text-slate-200">{cls.day}, {cls.time}</p><p className="text-sm text-slate-500 dark:text-slate-400">{cls.location}</p></div></div></div>))}
                </div>
            )}
        </div>
    );
};

const FinancialAwards = ({ tenantId, studentId }) => {
    const [awards, setAwards] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetchAwardsAPI(tenantId, studentId)
            .then(data => setAwards(data))
            .finally(() => setLoading(false));
    }, [tenantId, studentId]);

    const getStatusColor = (status) => {
        switch (status) { case 'Awarded': return 'border-green-500'; case 'Offered': return 'border-blue-500'; case 'Pending': return 'border-yellow-500'; default: return 'border-slate-400'; }
    };
    
    if (loading) return <LoadingSpinner message="Loading your financial awards..." />;

    return (
        <div className="p-1 sm:p-6 bg-white dark:bg-slate-800 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">My Financial Awards</h2>
            {awards.length === 0 ? (
                <EmptyState icon={Info} title="No Awards Found" message="Your financial awards could not be loaded or are not available." />
            ) : (
                <div className="space-y-4">{awards.map(award => (
                    <div key={award.id} className={`bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border-l-4 ${getStatusColor(award.status)} shadow-sm`}><div className="flex flex-col sm:flex-row justify-between items-start"><div><p className="font-bold text-lg text-slate-800 dark:text-slate-100">{award.name}</p><p className="text-sm text-slate-600 dark:text-slate-300">{award.type}</p>{award.awardYear && <p className="text-xs text-slate-500 dark:text-slate-400">Award Year: {award.awardYear}</p>}{award.term && <p className="text-xs text-slate-500 dark:text-slate-400">Term: {award.term}</p>}</div><div className="text-left sm:text-right mt-2 sm:mt-0"><p className="font-semibold text-xl text-slate-700 dark:text-slate-200">${award.amount.toLocaleString()}</p><p className="text-sm font-medium text-slate-500 dark:text-slate-400">{award.status}</p></div></div></div>))}
                </div>
            )}
        </div>
    );
};

const BookAppointment = ({ tenantId, studentId }) => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [bookingState, setBookingState] = useState({ status: 'idle', appointmentId: null, message: '' });

    const fetchAndSetAppointments = async () => {
        setLoading(true);
        fetchAppointmentsAPI(tenantId).then(setAppointments).finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchAndSetAppointments();
    }, [tenantId]);

    const handleBookAppointment = async (appointmentId) => {
        setBookingState({ status: 'booking', appointmentId });
        try {
            const tenantConfig = await getTenantSisConfiguration(tenantId);
            const sisService = new SisService(tenantConfig);
            const result = await sisService.bookAppointmentForStudent(appointmentId, studentId);
            setBookingState({ status: 'booked', appointmentId, message: result.message });
            fetchAndSetAppointments(); // Re-fetch on success
        } catch (error) {
            setBookingState({ status: 'error', appointmentId, message: error.message });
        }
    };
    
    if (loading) return <LoadingSpinner message="Loading available appointments..." />;

    return (
        <div className="p-1 sm:p-6 bg-white dark:bg-slate-800 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Book an Appointment with a Success Coach</h2>
            {appointments.length === 0 ? (
                <EmptyState icon={Info} title="No Appointments Available" message="Please check back later for more open slots."/>
            ) : (
                <div className="space-y-4">{appointments.map(appt => (
                    <div key={appt.id} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border-l-4 border-purple-500 shadow-sm"><div className="flex flex-col sm:flex-row justify-between items-center"><div className="flex-1 mb-3 sm:mb-0"><p className="font-bold text-lg text-slate-800 dark:text-slate-100">{appt.coachName}</p><p className="text-sm text-slate-600 dark:text-slate-300">{new Date(appt.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</p><p className="text-sm text-slate-500 dark:text-slate-400">{appt.time} ({appt.duration} mins)</p></div><div className="w-full sm:w-auto">{bookingState.appointmentId === appt.id ? ( bookingState.status === 'booking' ? <LoadingSpinner message="Booking..." /> : bookingState.status === 'booked' ? <p className="text-center font-semibold text-green-600">{bookingState.message}</p> : <p className="text-center font-semibold text-red-600">{bookingState.message}</p> ) : ( <button onClick={() => handleBookAppointment(appt.id)} className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition" disabled={bookingState.status !== 'idle'}>Book Now</button> )}</div></div></div>))}
                </div>
            )}
        </div>
    );
};

// --- Reusable UI Components ---

const EmptyState = ({ icon: Icon, title, message }) => (
    <div className="text-center py-10 px-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
        {Icon && <Icon className="h-12 w-12 mx-auto text-slate-400 mb-4" />}
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
        <p className="text-slate-500 dark:text-slate-400">{message}</p>
    </div>
);

const LoadingSpinner = ({ message }) => (
    <div className="flex items-center justify-center p-4 text-slate-500 dark:text-slate-400">
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        <p className="text-sm font-medium">{message}</p>
    </div>
);

const ChatMessage = ({ message }) => {
    const isUser = message.role === 'user';
    const { tenantId } = useTenant();

    const formattedText = useMemo(() => {
        if ((message.role === 'user' || message.role === 'assistant') && message.text) {
            return message.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-200 dark:bg-slate-900 p-2 my-2 rounded-md font-mono text-sm overflow-x-auto"><code>$1</code></pre>').replace(/`([^`]+)`/g, '<code class="bg-slate-200 dark:bg-slate-900/50 px-1 rounded-sm font-mono text-sm">$1</code>').replace(/\n/g, '<br />');
        }
        return '';
    }, [message.text, message.role]);

    if (message.role === 'system_ui' && message.type === 'inline_appointment_booking') {
        return (
            <div className="flex justify-center w-full my-4">
                <div className="max-w-lg w-full p-4 rounded-lg bg-slate-100 dark:bg-slate-700 shadow-md">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Book Your Appointment</h3>
                    <InlineAppointmentBooking appointments={message.data} studentId={message.studentId} tenantId={tenantId} onBookSuccess={(msg) => message.addMessage({ role: 'assistant', text: `Booking successful: ${msg}` })} onBookError={(msg) => message.addMessage({ role: 'assistant', text: `Booking failed: ${msg}` })} />
                </div>
            </div>
        );
    }

    return (
        <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {!isUser && <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white"><BrainCircuit size={18} /></div>}
            <div className={`max-w-lg p-3 rounded-lg ${isUser ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>
                <div className="prose prose-slate dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: formattedText }} />
            </div>
            {isUser && <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center"><User size={18} /></div>}
        </div>
    );
};

const InlineAppointmentBooking = ({ appointments, studentId, tenantId, onBookSuccess, onBookError }) => {
    const [bookingState, setBookingState] = useState({ status: 'idle', appointmentId: null, message: '' });

    const handleBookAppointment = async (appointmentId) => {
        setBookingState({ status: 'booking', appointmentId });
        try {
            const tenantConfig = await getTenantSisConfiguration(tenantId);
            const sisService = new SisService(tenantConfig);
            const result = await sisService.bookAppointmentForStudent(appointmentId, studentId);
            setBookingState({ status: 'booked', appointmentId, message: result.message });
            onBookSuccess(result.message);
        } catch (error) {
            setBookingState({ status: 'error', appointmentId, message: error.message });
            onBookError(error.message);
        }
    };

    if (!appointments || appointments.length === 0) {
        return <EmptyState title="No Slots Available" message="There are no appointments to book right now." />;
    }
    
    return (
        <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Available Slots:</p>
            {appointments.map(appt => (
                <div key={appt.id} className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border-l-4 border-purple-500 shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-center">
                        <div className="flex-1 mb-2 sm:mb-0">
                            <p className="font-bold text-md text-slate-800 dark:text-slate-100">{appt.coachName}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-300">{new Date(appt.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })} at {appt.time} ({appt.duration} mins)</p>
                        </div>
                        <div className="w-full sm:w-auto">
                            {bookingState.appointmentId === appt.id ? (
                                bookingState.status === 'booking' ? <LoadingSpinner message="Booking..." /> :
                                bookingState.status === 'booked' ? <p className="text-center text-green-600 text-sm">{bookingState.message}</p> :
                                <p className="text-center text-red-600 text-sm">{bookingState.message}</p>
                            ) : (
                                <button onClick={() => handleBookAppointment(appt.id)} className="w-full sm:w-auto px-3 py-1 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition">Book</button>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
