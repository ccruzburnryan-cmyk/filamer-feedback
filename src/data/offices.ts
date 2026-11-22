export type OfficeCategory = 'Academic' | 'Administrative';

export interface CampusOffice {
  id: string;
  name: string;
  fullName: string;
  category: OfficeCategory;
  description: string;
}

export interface FeedbackEntry {
  id: string;
  officeId: string;
  rating: number;
  essay: string;
  createdAt: string;
}

export interface OfficeSummary {
  officeId: string;
  count: number;
  averageRating: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface BackgroundPhotoOption {
  id: string;
  label: string;
  src: string;
  caption: string;
}

export const UNIVERSITY_SEAL_SRC = '/assets/aistudio/images_4f114c0b.png';

export const BACKGROUND_PHOTOS: BackgroundPhotoOption[] = [
  {
    id: 'courtyard',
    label: 'Campus Courtyard',
    src: '/assets/aistudio/images__8__6a69967f.jpeg',
    caption: 'Main Campus Courtyard & Historical Marker',
  },
  {
    id: 'facade',
    label: 'University Hall',
    src: '/assets/aistudio/download_4c537b7c.jpeg',
    caption: 'Filamer Christian University Academic Building',
  },
  {
    id: 'seals',
    label: 'College Seals',
    src: '/assets/aistudio/images__9__2a4ed183.jpeg',
    caption: 'Filamer Christian University College & School Seals',
  },
];

export const CAMPUS_OFFICES: CampusOffice[] = [
  {
    id: 'cba',
    name: 'CBA department',
    fullName: 'College of Business and Accountancy',
    category: 'Academic',
    description: 'Academic advising, faculty instruction, curriculum support, and departmental services.',
  },
  {
    id: 'cte',
    name: 'CTE department',
    fullName: 'College of Teacher Education',
    category: 'Academic',
    description: 'Pre-service teacher formation, instruction quality, and practicum coordination.',
  },
  {
    id: 'cn',
    name: 'CN department',
    fullName: 'College of Nursing',
    category: 'Academic',
    description: 'Nursing instruction, skills laboratory readiness, and clinical supervision.',
  },
  {
    id: 'chtm',
    name: 'CHTM department',
    fullName: 'College of Hospitality and Tourism Management',
    category: 'Academic',
    description: 'Hospitality laboratory facilities, practicum support, and classroom instruction.',
  },
  {
    id: 'cas',
    name: 'CAS department',
    fullName: 'College of Arts and Sciences',
    category: 'Academic',
    description: 'Liberal arts and sciences instruction, research mentoring, and student inquiries.',
  },
  {
    id: 'ccs',
    name: 'CCS department',
    fullName: 'College of Computer Studies',
    category: 'Academic',
    description: 'Computing laboratories, technical instruction, project guidance, and faculty support.',
  },
  {
    id: 'ccje',
    name: 'CCJE department',
    fullName: 'College of Criminal Justice Education',
    category: 'Academic',
    description: 'Criminology training, laboratory equipment, faculty mentorship, and discipline support.',
  },
  {
    id: 'coe',
    name: 'COE department',
    fullName: 'College of Engineering',
    category: 'Academic',
    description: 'Engineering instruction, technical workshops, laboratory access, and academic consultation.',
  },
  {
    id: 'gs',
    name: 'GS department',
    fullName: 'Graduate School',
    category: 'Academic',
    description: 'Graduate seminar quality, thesis and dissertation advising, and scholarly resources.',
  },
  {
    id: 'cashier',
    name: 'Cashier',
    fullName: "University Cashier's Office",
    category: 'Administrative',
    description: 'Tuition payment processing, official receipts, queue efficiency, and counter courtesy.',
  },
  {
    id: 'registrar',
    name: 'Registrar',
    fullName: 'Office of the University Registrar',
    category: 'Administrative',
    description: 'Enrollment records, transcript requests, certifications, and document release timelines.',
  },
  {
    id: 'university-enterprises',
    name: 'University Enterprises',
    fullName: 'University Enterprises',
    category: 'Administrative',
    description: 'Uniforms, textbooks, campus supplies, order fulfillment, and customer assistance.',
  },
  {
    id: 'assessment',
    name: 'Assessment',
    fullName: 'Assessment & Evaluation Office',
    category: 'Administrative',
    description: 'Fee assessment accuracy, examination permits, billing clarity, and financial guidance.',
  },
];

export const RATING_LABELS: Record<number, string> = {
  1: 'Needs Immediate Attention',
  2: 'Below Expectations',
  3: 'Satisfactory',
  4: 'Very Good',
  5: 'Outstanding',
};

export function getOfficeById(officeId: string): CampusOffice | undefined {
  return CAMPUS_OFFICES.find((office) => office.id === officeId);
}
