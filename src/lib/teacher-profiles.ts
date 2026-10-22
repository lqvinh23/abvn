export type TeacherStatus = "active" | "guest";

export const TEACHERS_PER_PAGE = 12;
export const DEMO_INTRO_VIDEO_URL =
  "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ";

export type TeacherProfile = {
  slug: string;
  name: string;
  location: string;
  country: string;
  status: TeacherStatus;
  memberSince: string;
  sessions: number;
  portrait: string;
  bio: string | null;
  introVideoUrl: string | null;
  sampleDetails: {
    bio: string;
    teachingFocus: string[];
    hobbies: string[];
    languages: string[];
    teachingApproach: string;
    learnersSupported: number;
  };
};

// Status and sampleDetails are demo data, not verified teacher information.
export const teacherProfiles: TeacherProfile[] = [
  {
    slug: "alon-kaiser",
    name: "Alon Kaiser",
    location: "Melbourne, Australia",
    country: "Australia",
    status: "active",
    memberSince: "November 2017",
    sessions: 9750,
    portrait: "/images/founding-teacher-alon-placeholder.jpg",
    bio: "Alon has taught for over 30 years. He trained at university in Adelaide, earned a master’s degree in Information Technology in Education in Melbourne, and worked for 20 years as Head of Geography at a girls’ school. He also taught English to upper-primary students in Kenya and completed a CELTA qualification in 2015.",
    introVideoUrl: null,
    sampleDetails: {
      bio: "I enjoy helping curious learners connect English with the world around them. In our lessons, we can discuss places, people, and the everyday stories that make conversation meaningful.",
      teachingFocus: [
        "Conversational English",
        "Geography & culture",
        "Speaking confidence",
      ],
      hobbies: ["Travel", "Reading", "Exploring nature"],
      languages: ["English"],
      teachingApproach:
        "A relaxed conversation, thoughtful questions, and practical feedback to help you express your own ideas.",
      learnersSupported: 320,
    },
  },
  {
    slug: "bill-wilson",
    name: "Bill Wilson",
    location: "Underhill, Vermont, USA",
    country: "United States",
    status: "active",
    memberSince: "March 2020",
    sessions: 2406,
    portrait: "/images/founding-teacher-jim-placeholder.jpg",
    bio: null,
    introVideoUrl: null,
    sampleDetails: {
      bio: "I believe a good conversation starts with feeling comfortable. I like helping learners find their voice through stories, everyday situations, and topics they genuinely enjoy.",
      teachingFocus: ["Everyday English", "Pronunciation", "Listening skills"],
      hobbies: ["Hiking", "Photography", "Gardening"],
      languages: ["English"],
      teachingApproach:
        "Build confidence through friendly discussion, useful vocabulary, and gentle pronunciation practice.",
      learnersSupported: 145,
    },
  },
  {
    slug: "christopher-liu",
    name: "Christopher Liu",
    location: "Singapore",
    country: "Singapore",
    status: "active",
    memberSince: "January 2022",
    sessions: 550,
    portrait: "/images/team-tra-my-placeholder.jpg",
    bio: null,
    introVideoUrl: null,
    sampleDetails: {
      bio: "I enjoy exploring how English can open doors to new conversations and opportunities. My sample lessons combine practical situations with discussions about technology and life in different cultures.",
      teachingFocus: [
        "Workplace English",
        "Presentation skills",
        "Cultural exchange",
      ],
      hobbies: ["Technology", "Cooking", "City walks"],
      languages: ["English", "Mandarin"],
      teachingApproach:
        "Practise realistic scenarios and short presentations, with clear feedback you can use in your next conversation.",
      learnersSupported: 62,
    },
  },
  {
    slug: "ani-gabrielyan",
    name: "Ani Gabrielyan",
    location: "Armenia",
    country: "Armenia",
    status: "active",
    memberSince: "June 2022",
    sessions: 200,
    portrait: "/images/team-hong-hanh-placeholder.jpg",
    bio: null,
    introVideoUrl: null,
    sampleDetails: {
      bio: "Learning a language is also a way to discover new perspectives. I enjoy creative conversations that give learners space to ask questions, share interests, and try something new.",
      teachingFocus: [
        "Creative speaking",
        "Vocabulary building",
        "Beginner conversation",
      ],
      hobbies: ["Art", "Music", "Learning languages"],
      languages: ["English", "Armenian"],
      teachingApproach:
        "Use pictures, stories, and creative prompts to make speaking practice approachable and enjoyable.",
      learnersSupported: 34,
    },
  },
  {
    slug: "anthony-mccarthy",
    name: "Anthony McCarthy",
    location: "Quito, Ecuador",
    country: "Ecuador",
    status: "active",
    memberSince: "April 2020",
    sessions: 281,
    portrait: "/images/team-my-huyen-placeholder.jpg",
    bio: null,
    introVideoUrl: null,
    sampleDetails: {
      bio: "I enjoy meeting people through language and sharing stories about life in different places. My aim is to make English practice feel like a conversation you look forward to.",
      teachingFocus: ["Travel English", "Storytelling", "Speaking fluency"],
      hobbies: ["Travel", "Walking", "History"],
      languages: ["English", "Spanish"],
      teachingApproach:
        "Develop fluency with open-ended questions, real-life stories, and plenty of time to speak.",
      learnersSupported: 41,
    },
  },
  {
    slug: "barry-mattacott",
    name: "Barry Mattacott",
    location: "Da Nang",
    country: "Vietnam",
    status: "guest",
    memberSince: "October 2021",
    sessions: 40,
    portrait: "/images/team-thao-ngan-placeholder.jpg",
    bio: null,
    introVideoUrl: null,
    sampleDetails: {
      bio: "I like making English practice practical and easy to connect with daily life. A friendly chat about familiar experiences can be a great first step toward speaking with confidence.",
      teachingFocus: [
        "Everyday conversation",
        "Travel vocabulary",
        "Listening practice",
      ],
      hobbies: ["Cycling", "Local food", "Beach walks"],
      languages: ["English"],
      teachingApproach:
        "Start with familiar topics, practise useful phrases, and gradually build longer conversations.",
      learnersSupported: 12,
    },
  },
  {
    slug: "ai",
    name: "Ai",
    location: "United States",
    country: "United States",
    status: "active",
    memberSince: "August 2024",
    sessions: 688,
    portrait: "/images/team-nhat-linh-placeholder.jpg",
    bio: null,
    introVideoUrl: null,
    sampleDetails: {
      bio: "I enjoy helping learners share their ideas clearly and confidently. From everyday topics to personal goals, our conversations can make room for what matters most to you.",
      teachingFocus: [
        "Speaking confidence",
        "Everyday English",
        "Clear communication",
      ],
      hobbies: ["Reading", "Film", "Cooking"],
      languages: ["English"],
      teachingApproach:
        "Student-led discussions with encouraging feedback and vocabulary tailored to your interests.",
      learnersSupported: 73,
    },
  },
  {
    slug: "angela-c",
    name: "Angela C.",
    location: "United States",
    country: "United States",
    status: "active",
    memberSince: "January 2026",
    sessions: 18,
    portrait: "/images/team-tu-thu-placeholder.jpg",
    bio: null,
    introVideoUrl: null,
    sampleDetails: {
      bio: "I enjoy creating a welcoming space where learners can practise without worrying about making mistakes. Small conversations can lead to meaningful progress over time.",
      teachingFocus: [
        "Beginner English",
        "Everyday vocabulary",
        "Pronunciation",
      ],
      hobbies: ["Music", "Baking", "Community activities"],
      languages: ["English"],
      teachingApproach:
        "Short activities, patient explanations, and repeated practice at a pace that feels comfortable.",
      learnersSupported: 8,
    },
  },
  {
    slug: "betty-ho",
    name: "Betty Ho",
    location: "Paris, France",
    country: "France",
    status: "guest",
    memberSince: "March 2025",
    sessions: 24,
    portrait: "/images/team-hong-thu-placeholder.jpg",
    bio: null,
    introVideoUrl: null,
    sampleDetails: {
      bio: "I enjoy the connections that grow when people share their cultures and interests. English practice can be a chance to discover new ideas while learning to express your own.",
      teachingFocus: [
        "Cultural exchange",
        "Travel English",
        "Conversation practice",
      ],
      hobbies: ["Museums", "Photography", "Food"],
      languages: ["English", "French"],
      teachingApproach:
        "Explore culture and everyday experiences through relaxed discussions and practical vocabulary.",
      learnersSupported: 10,
    },
  },
  {
    slug: "challis",
    name: "Challis",
    location: "Da Nang, Vietnam",
    country: "Vietnam",
    status: "guest",
    memberSince: "June 2021",
    sessions: 361,
    portrait: "/images/team-thu-trang-placeholder.jpg",
    bio: null,
    introVideoUrl: null,
    sampleDetails: {
      bio: "I enjoy helping learners turn what they know into conversations they can use. Sharing everyday stories is a simple way to practise, connect, and keep learning.",
      teachingFocus: [
        "Conversational English",
        "Listening skills",
        "Storytelling",
      ],
      hobbies: ["Travel", "Swimming", "Books"],
      languages: ["English"],
      teachingApproach:
        "Connect new vocabulary with your own experiences and practise expressing ideas in different ways.",
      learnersSupported: 47,
    },
  },
  {
    slug: "emma-parker",
    name: "Emma Parker",
    location: "Bristol, United Kingdom",
    country: "United Kingdom",
    status: "active",
    memberSince: "May 2022",
    sessions: 820,
    portrait: "/images/team-hong-nhung-placeholder.jpg",
    bio: null,
    introVideoUrl: null,
    sampleDetails: {
      bio: "Sample profile: I enjoy helping learners find confidence through storytelling and everyday conversation. We can explore topics you love while building practical English skills.",
      teachingFocus: [
        "Storytelling",
        "Conversational English",
        "Pronunciation",
      ],
      hobbies: ["Reading", "Theatre", "Hiking"],
      languages: ["English"],
      teachingApproach:
        "Use stories and open-ended questions to make conversation feel natural, with supportive feedback along the way.",
      learnersSupported: 86,
    },
  },
  {
    slug: "daniel-brooks",
    name: "Daniel Brooks",
    location: "Toronto, Canada",
    country: "Canada",
    status: "active",
    memberSince: "September 2023",
    sessions: 430,
    portrait: "/images/founding-teacher-jon-placeholder.jpg",
    bio: null,
    introVideoUrl: null,
    sampleDetails: {
      bio: "Sample profile: I like turning everyday situations into useful language practice. My conversations focus on helping you explain ideas clearly and ask questions with confidence.",
      teachingFocus: [
        "Everyday English",
        "Speaking fluency",
        "Workplace English",
      ],
      hobbies: ["Cycling", "Cooking", "Music"],
      languages: ["English", "French"],
      teachingApproach:
        "Practise real-life scenarios and build vocabulary around your personal learning goals.",
      learnersSupported: 54,
    },
  },
  {
    slug: "sofia-martinez",
    name: "Sofia Martinez",
    location: "Madrid, Spain",
    country: "Spain",
    status: "active",
    memberSince: "February 2024",
    sessions: 320,
    portrait: "/images/team-ngoc-giau-placeholder.jpg",
    bio: null,
    introVideoUrl: null,
    sampleDetails: {
      bio: "Sample profile: I enjoy sharing cultures through language. Together we can practise English through travel stories, creative activities, and conversations about your interests.",
      teachingFocus: [
        "Cultural exchange",
        "Travel English",
        "Vocabulary building",
      ],
      hobbies: ["Travel", "Art", "Photography"],
      languages: ["English", "Spanish"],
      teachingApproach:
        "Connect new words with memorable stories and give learners plenty of space to speak.",
      learnersSupported: 39,
    },
  },
  {
    slug: "james-bennett",
    name: "James Bennett",
    location: "Wellington, New Zealand",
    country: "New Zealand",
    status: "active",
    memberSince: "July 2023",
    sessions: 320,
    portrait: "/images/founder-placeholder.jpg",
    bio: null,
    introVideoUrl: null,
    sampleDetails: {
      bio: "Sample profile: I enjoy discussing the natural world and learning about everyday life in different places. My goal is to help you speak comfortably and keep your curiosity alive.",
      teachingFocus: [
        "Listening skills",
        "Conversational English",
        "Speaking confidence",
      ],
      hobbies: ["Nature walks", "Gardening", "Books"],
      languages: ["English"],
      teachingApproach:
        "Start with familiar topics, then build longer conversations with practical listening and speaking exercises.",
      learnersSupported: 42,
    },
  },
  {
    slug: "maya-thompson",
    name: "Maya Thompson",
    location: "Cape Town, South Africa",
    country: "South Africa",
    status: "active",
    memberSince: "March 2025",
    sessions: 150,
    portrait: "/images/team-thuy-tien-placeholder.jpg",
    bio: null,
    introVideoUrl: null,
    sampleDetails: {
      bio: "Sample profile: I like creating a welcoming space for learners to try new words and share their ideas. We can practise English through music, stories, and everyday experiences.",
      teachingFocus: [
        "Beginner conversation",
        "Pronunciation",
        "Everyday vocabulary",
      ],
      hobbies: ["Music", "Baking", "Swimming"],
      languages: ["English"],
      teachingApproach:
        "Break conversations into achievable steps, with patient explanations and encouraging feedback.",
      learnersSupported: 26,
    },
  },
  {
    slug: "oliver-chen",
    name: "Oliver Chen",
    location: "Sydney, Australia",
    country: "Australia",
    status: "active",
    memberSince: "January 2026",
    sessions: 85,
    portrait: "/images/team-hr-placeholder.jpg",
    bio: null,
    introVideoUrl: null,
    sampleDetails: {
      bio: "Sample profile: I enjoy helping learners communicate their ideas through clear, practical English. Technology, hobbies, and future goals make great starting points for our conversations.",
      teachingFocus: [
        "Presentation skills",
        "Workplace English",
        "Speaking fluency",
      ],
      hobbies: ["Technology", "Photography", "Running"],
      languages: ["English", "Mandarin"],
      teachingApproach:
        "Explore a topic together, practise explaining your ideas, and finish with useful feedback for next time.",
      learnersSupported: 19,
    },
  },
];

export function getTeachersByStatus(
  profiles: readonly TeacherProfile[],
  status: TeacherStatus,
) {
  return profiles
    .filter((teacher) => teacher.status === status)
    .sort(
      (a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name, "en"),
    );
}
