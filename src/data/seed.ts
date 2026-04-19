export type Announcement = {
  id: string;
  title: string;
  description: string;
  date: string;
  urgent?: boolean;
};

export type Notice = {
  id: string;
  title: string;
  description: string;
  date: string;
  category: "meeting" | "circular" | "decision" | "legal";
  attachment?: string;
};

export const announcements: Announcement[] = [
  {
    id: "a1",
    title: "Annual General Meeting — 2025",
    description: "The AGM will be held at the Samaj Bhavan on the 15th of next month. All members are humbly requested to attend.",
    date: "2025-04-15",
    urgent: true,
  },
  {
    id: "a2",
    title: "Holi Milan Samaroh",
    description: "Join us for a traditional Holi Milan with cultural performances, prasad and community bonding.",
    date: "2025-03-25",
  },
  {
    id: "a3",
    title: "Scholarship Applications Open",
    description: "Applications for the 2025 community scholarship programme are now open for meritorious students.",
    date: "2025-03-10",
  },
  {
    id: "a4",
    title: "New Matrimonial Registrations",
    description: "We are pleased to welcome new families to our matrimonial directory. Visit the directory section to connect.",
    date: "2025-02-28",
  },
];

export const notices: Notice[] = [
  {
    id: "n1",
    title: "Minutes of Executive Committee Meeting — Feb 2025",
    description: "Summary of decisions taken in the executive committee meeting held on 12th February 2025.",
    date: "2025-02-15",
    category: "meeting",
    attachment: "#",
  },
  {
    id: "n2",
    title: "Circular: Updated Membership Guidelines",
    description: "Revised guidelines for new and renewing members, effective from April 2025.",
    date: "2025-02-10",
    category: "circular",
    attachment: "#",
  },
  {
    id: "n3",
    title: "Decision: Bhavan Renovation Project",
    description: "The committee has approved the proposal for renovation of the community Bhavan. Work begins next quarter.",
    date: "2025-01-28",
    category: "decision",
    attachment: "#",
  },
  {
    id: "n4",
    title: "Legal Notice: Trust Registration Update",
    description: "Updated trust registration documents are available for member reference.",
    date: "2025-01-15",
    category: "legal",
    attachment: "#",
  },
  {
    id: "n5",
    title: "Notice: Election of Office Bearers",
    description: "Nominations are invited for the upcoming election of office bearers.",
    date: "2025-01-05",
    category: "circular",
    attachment: "#",
  },
];
