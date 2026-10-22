export type NewsArticle = {
  slug: string;
  title: string;
  category: string;
  date: string;
  summary: string;
  image: string;
  body: string[];
};

// Placeholder content: replace with real ABVN announcements before launch.
export const newsArticles: NewsArticle[] = [
  {
    slug: "autumn-2026-volunteer-teachers-welcome",
    title: "Welcome to our autumn 2026 volunteer teacher cohort",
    category: "Community",
    date: "2026-10-12",
    summary:
      "Twenty-four new volunteer teachers from nine countries have joined ABVN this term, ready to start weekly conversation sessions with students across Vietnam.",
    image: "/images/volunteer-team.jpg",
    body: [
      "This term, 24 volunteer teachers from nine countries are joining A Better Vietnam’s learning community. They bring a range of experiences and a shared interest in helping students build confidence using English.",
      "Teachers and learners meet for weekly conversation sessions. Together, they practise speaking, explore new topics, and learn about each other’s cultures in a friendly online setting.",
      "We’re delighted to welcome the new cohort and grateful to everyone who gives their time to make these connections possible. We look forward to sharing more stories from their sessions throughout the term.",
    ],
  },
  {
    slug: "student-speaking-showcase-hanoi",
    title: "Students shine at the ABVN speaking showcase",
    category: "Events",
    date: "2026-09-27",
    summary:
      "More than 80 learners presented short talks on technology, travel, and local traditions in a day of confident, creative English.",
    image: "/images/student-community.jpg",
    body: [
      "More than 80 learners took part in the ABVN speaking showcase, sharing short presentations on topics that matter to them. Technology, travel, and local traditions all featured in a lively programme.",
      "The showcase gave students an opportunity to practise organizing their ideas, speaking to an audience, and listening to one another. Each presentation reflected the learner’s own interests and perspective.",
      "Thank you to the students, volunteers, and organizers who made the event possible. We’re proud of everyone who stepped up to speak and support their fellow learners.",
    ],
  },
  {
    slug: "new-partner-schools-central-highlands",
    title: "Five new partner schools join the network",
    category: "Partnerships",
    date: "2026-09-10",
    summary:
      "ABVN is expanding its reach to the Central Highlands, bringing free English practice to students who have had limited access to native-speaking teachers.",
    image: "/images/learning-community.jpg",
    body: [
      "Five partner schools in the Central Highlands have joined the A Better Vietnam network. This collaboration is an opportunity to connect more students with regular English conversation practice.",
      "Through online sessions with volunteer teachers, learners can practise speaking in a supportive setting and discover new perspectives through conversation. Schools help connect students with the programme and provide local support.",
      "We’re grateful to our new school partners for working with us to make learning opportunities more accessible. We hope this is the beginning of a lasting collaboration.",
    ],
  },
  {
    slug: "10000-sessions-milestone",
    title: "A milestone: 10,000 sessions taught this year",
    category: "Milestones",
    date: "2026-08-21",
    summary:
      "Thanks to our volunteers, ABVN reached 10,000 live learning sessions in 2026, a new record for the community.",
    image: "/images/global-learning.jpg",
    body: [
      "A Better Vietnam has reached 10,000 live learning sessions in 2026. This milestone reflects the time and care volunteers have shared with learners throughout the year.",
      "Every session is a chance to practise English, ask questions, and build the confidence to communicate. Behind the total are many individual conversations and the relationships that grow over time.",
      "Thank you to all our volunteer teachers, students, and partners for making this possible. We’ll keep working to create welcoming spaces for learners to practise and connect.",
    ],
  },
  {
    slug: "summer-english-camp-recap",
    title: "Summer English camp recap: stories, songs, and new friends",
    category: "Events",
    date: "2026-07-30",
    summary:
      "Two weeks of games, storytelling, and cultural exchange wrapped up with a closing ceremony attended by families and volunteers online.",
    image: "/images/english-classroom.jpg",
    body: [
      "ABVN’s summer English camp brought students together for two weeks of activities built around communication and creativity. Games and storytelling offered plenty of chances to use English in a relaxed way.",
      "Learners also shared traditions and stories from their own lives, making cultural exchange part of the experience. Volunteers joined online to encourage students and take part in the activities.",
      "The camp ended with a virtual celebration for students, families, and volunteers. Thank you to everyone who helped make these weeks memorable.",
    ],
  },
  {
    slug: "volunteer-training-workshop-series",
    title: "Volunteer training workshop series now open",
    category: "Volunteering",
    date: "2026-07-08",
    summary:
      "A new series of free online workshops helps teachers prepare for engaging, learner-friendly conversation sessions.",
    image: "/images/volunteer-team.jpg",
    body: [
      "ABVN is opening a new series of free online workshops for volunteer teachers. The sessions are designed to help volunteers prepare conversation activities that are engaging and welcoming for learners.",
      "Workshop topics include planning a session around student interests, encouraging participation, and adapting activities for different levels of confidence. Teachers can share ideas and learn from one another.",
      "The workshops are part of ABVN’s ongoing support for volunteers. We believe that thoughtful preparation helps create positive learning experiences for everyone in the conversation.",
    ],
  },
  {
    slug: "student-scholarship-announcement",
    title: "Learning grants announced for 2026–2027 students",
    category: "Announcements",
    date: "2026-06-18",
    summary:
      "ABVN has opened applications for learning grants that help motivated students get the devices and connectivity they need to join sessions.",
    image: "/images/student-community.jpg",
    body: [
      "Applications are open for ABVN learning grants for the 2026–2027 school year. The grants are intended to help students access the equipment or internet connectivity they need to take part in online learning sessions.",
      "Reliable access to a device and connection can make it easier for learners to join regular sessions and stay connected with their teachers. The programme aims to reduce some of the practical barriers students may face.",
      "Students interested in applying can contact the ABVN team for information about eligibility and the application process. We look forward to supporting learners as they continue their studies.",
    ],
  },
  {
    slug: "teacher-spotlight-cultural-exchange",
    title: "Teacher spotlight: sharing culture through conversation",
    category: "Community",
    date: "2026-05-29",
    summary:
      "Our founding teachers reflect on the friendships and surprises that come from years of weekly sessions with Vietnamese learners.",
    image: "/images/founding-teachers-placeholder.jpg",
    body: [
      "For ABVN’s founding teachers, the most memorable part of volunteering is often the conversation itself. Week after week, teachers and learners get to know one another while practising English together.",
      "Sessions can lead to unexpected discoveries: a shared interest, a new point of view, or a story about everyday life in another country. These moments make language practice feel personal and bring cultures closer.",
      "We’re thankful to the teachers who helped shape ABVN’s community and continue to share their time with learners. Their commitment shows how meaningful a regular conversation can be.",
    ],
  },
  {
    slug: "sdg-education-week",
    title: "Celebrating education for all during SDG Education Week",
    category: "Impact",
    date: "2026-05-05",
    summary:
      "ABVN joined the global conversation on quality education, sharing how free, volunteer-led English practice supports young people.",
    image: "/images/global-learning.jpg",
    body: [
      "During SDG Education Week, A Better Vietnam joined educators and communities reflecting on the importance of inclusive, quality learning opportunities.",
      "ABVN’s volunteer-led English sessions give students a place to practise communication and connect with teachers from around the world. Regular conversation complements classroom learning and encourages learners to use their skills with confidence.",
      "We’re proud to be part of a community working toward wider access to education. Thank you to our students, volunteers, and partners for contributing to that shared effort.",
    ],
  },
];
