export type TeacherProfile = {
  slug: string;
  name: string;
  location: string;
  memberSince: string;
  sessions: string;
  portrait: string;
  bio: string | null;
  introVideoUrl: string | null;
};

export const teacherProfiles: TeacherProfile[] = [
  {
    slug: "alon-kaiser",
    name: "Alon Kaiser",
    location: "Melbourne, Australia",
    memberSince: "November 2017",
    sessions: "9,750",
    portrait: "/images/founding-teacher-alon-placeholder.jpg",
    bio: "Alon has taught for over 30 years. He trained at university in Adelaide, earned a master’s degree in Information Technology in Education in Melbourne, and worked for 20 years as Head of Geography at a girls’ school. He also taught English to upper-primary students in Kenya and completed a CELTA qualification in 2015.",
    introVideoUrl: null,
  },
  {
    slug: "bill-wilson",
    name: "Bill Wilson",
    location: "Underhill, Vermont, USA",
    memberSince: "March 2020",
    sessions: "2,406",
    portrait: "/images/founding-teacher-jim-placeholder.jpg",
    bio: null,
    introVideoUrl: null,
  },
  {
    slug: "christopher-liu",
    name: "Christopher Liu",
    location: "Singapore",
    memberSince: "January 2022",
    sessions: "550",
    portrait: "/images/team-tra-my-placeholder.jpg",
    bio: null,
    introVideoUrl: null,
  },
  {
    slug: "ani-gabrielyan",
    name: "Ani Gabrielyan",
    location: "Armenia",
    memberSince: "June 2022",
    sessions: "200",
    portrait: "/images/team-hong-hanh-placeholder.jpg",
    bio: null,
    introVideoUrl: null,
  },
  {
    slug: "anthony-mccarthy",
    name: "Anthony McCarthy",
    location: "Quito, Ecuador",
    memberSince: "April 2020",
    sessions: "281",
    portrait: "/images/team-my-huyen-placeholder.jpg",
    bio: null,
    introVideoUrl: null,
  },
  {
    slug: "barry-mattacott",
    name: "Barry Mattacott",
    location: "Da Nang",
    memberSince: "October 2021",
    sessions: "40",
    portrait: "/images/team-thao-ngan-placeholder.jpg",
    bio: null,
    introVideoUrl: null,
  },
  {
    slug: "ai",
    name: "Ai",
    location: "United States",
    memberSince: "August 2024",
    sessions: "688",
    portrait: "/images/team-nhat-linh-placeholder.jpg",
    bio: null,
    introVideoUrl: null,
  },
  {
    slug: "angela-c",
    name: "Angela C.",
    location: "United States",
    memberSince: "January 2026",
    sessions: "18",
    portrait: "/images/team-tu-thu-placeholder.jpg",
    bio: null,
    introVideoUrl: null,
  },
  {
    slug: "betty-ho",
    name: "Betty Ho",
    location: "Paris, France",
    memberSince: "March 2025",
    sessions: "24",
    portrait: "/images/team-hong-thu-placeholder.jpg",
    bio: null,
    introVideoUrl: null,
  },
  {
    slug: "challis",
    name: "Challis",
    location: "Da Nang, Vietnam",
    memberSince: "June 2021",
    sessions: "361",
    portrait: "/images/team-thu-trang-placeholder.jpg",
    bio: null,
    introVideoUrl: null,
  },
];
