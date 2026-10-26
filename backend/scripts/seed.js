// scripts/seed.js — Seed database with sample data for development/testing
// Run: npm run seed
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');

const User = require('../models/User');
const Intern = require('../models/Intern');
const Mentor = require('../models/Mentor');
const Module = require('../models/Module');
const TaskTemplate = require('../models/TaskTemplate');
const TaskAssignment = require('../models/TaskAssignment');

const MODULES = [
  { name: 'Frontend Development', techStack: ['HTML', 'CSS', 'JavaScript', 'React'], description: 'Build responsive UIs' },
  { name: 'Backend Development', techStack: ['Node.js', 'Express', 'MongoDB', 'REST API'], description: 'Build APIs and server logic' },
  { name: 'Full-Stack Development', techStack: ['React', 'Node.js', 'MongoDB', 'Express'], description: 'End-to-end web apps' },
  { name: 'Python Programming', techStack: ['Python', 'Flask', 'Pandas', 'NumPy'], description: 'Python development' },
  { name: 'AI and Machine Learning', techStack: ['Python', 'TensorFlow', 'scikit-learn', 'Jupyter'], description: 'AI/ML model building' },
  { name: 'UI/UX Design', techStack: ['Figma', 'Adobe XD', 'Prototyping', 'Wireframing'], description: 'User experience design' },
  { name: 'Digital Marketing', techStack: ['SEO', 'Google Analytics', 'Social Media', 'Content'], description: 'Digital marketing strategies' },
  { name: 'Software Testing', techStack: ['Selenium', 'Jest', 'Postman', 'JIRA'], description: 'QA and testing' },
  { name: 'Cloud Computing', techStack: ['AWS', 'Docker', 'Kubernetes', 'CI/CD'], description: 'Cloud infrastructure' },
];

const seed = async () => {
  await connectDB();
  console.log('\n🌱 Starting database seed...\n');

  // Clear existing data (dev only)
  await Promise.all([
    User.deleteMany({}),
    Intern.deleteMany({}),
    Mentor.deleteMany({}),
    Module.deleteMany({}),
    TaskTemplate.deleteMany({}),
    TaskAssignment.deleteMany({}),
  ]);
  console.log('✅ Cleared existing data');

  // ─── Modules ────────────────────────────────────────────────────────
  const modules = await Module.insertMany(MODULES);
  const moduleMap = {};
  modules.forEach((m) => { moduleMap[m.name] = m._id; });
  console.log(`✅ Created ${modules.length} modules`);

  // ─── Admin User ─────────────────────────────────────────────────────
  const adminUser = await User.create({
    name: 'Admin User',
    email: 'admin@company.com',
    password: 'Admin@1234',
    role: 'admin',
  });
  console.log('✅ Admin created: admin@company.com / Admin@1234');

  // ─── Mentors ────────────────────────────────────────────────────────
  const mentorData = [
    { name: 'Rajesh Kumar', email: 'rajesh@company.com', designation: 'Senior Frontend Developer', expertise: ['Frontend Development', 'Full-Stack Development'] },
    { name: 'Priya Sharma', email: 'priya@company.com', designation: 'ML Engineer', expertise: ['AI and Machine Learning', 'Python Programming'] },
    { name: 'Vikram Singh', email: 'vikram@company.com', designation: 'Backend Architect', expertise: ['Backend Development', 'Cloud Computing'] },
  ];

  const mentors = [];
  for (const m of mentorData) {
    const user = await User.create({ name: m.name, email: m.email, password: 'Mentor@1234', role: 'mentor' });
    const mentor = await Mentor.create({ user: user._id, name: m.name, email: m.email, designation: m.designation, expertise: m.expertise });
    mentors.push(mentor);
  }
  console.log(`✅ Created ${mentors.length} mentors (password: Mentor@1234)`);

  // ─── Task Templates ─────────────────────────────────────────────────
  const templateData = [
    {
      title: 'Build a Responsive Portfolio Website',
      description: 'Create a personal portfolio website showcasing your projects, skills, and contact information. The site must be fully responsive across mobile, tablet, and desktop devices.',
      module: 'Frontend Development', difficulty: 'easy', priority: 'high', estimatedDays: 7,
      techStack: ['HTML5', 'CSS3', 'JavaScript', 'Bootstrap 5'],
      deliverables: ['Responsive HTML/CSS website', 'Deployed GitHub Pages link', 'Mobile-first CSS', 'Contact form (can be static)'],
      stepByStep: ['Plan layout with wireframe', 'Set up HTML structure', 'Style with CSS/Bootstrap', 'Add JavaScript interactions', 'Test across devices', 'Deploy to GitHub Pages'],
      tags: ['html', 'css', 'responsive', 'portfolio'],
    },
    {
      title: 'Build a REST API with Node.js + MongoDB',
      description: 'Design and implement a RESTful API for a task management system. Include CRUD operations, authentication with JWT, and proper error handling.',
      module: 'Backend Development', difficulty: 'medium', priority: 'high', estimatedDays: 10,
      techStack: ['Node.js', 'Express.js', 'MongoDB', 'Mongoose', 'JWT'],
      deliverables: ['All CRUD endpoints working', 'JWT authentication', 'Postman collection', 'README with setup instructions', 'GitHub repo link'],
      stepByStep: ['Design API schema', 'Set up Express server', 'Create Mongoose models', 'Implement CRUD routes', 'Add JWT auth middleware', 'Test with Postman', 'Write documentation'],
      tags: ['nodejs', 'api', 'mongodb', 'jwt'],
    },
    {
      title: 'Train a Classification Model with scikit-learn',
      description: 'Use the Iris or Titanic dataset to train a machine learning classification model. Evaluate accuracy, precision, recall. Present findings in a Jupyter notebook.',
      module: 'AI and Machine Learning', difficulty: 'medium', priority: 'medium', estimatedDays: 8,
      techStack: ['Python', 'scikit-learn', 'Pandas', 'Matplotlib', 'Jupyter Notebook'],
      deliverables: ['Jupyter notebook with EDA + model training', 'Accuracy >= 85%', 'Model evaluation report (confusion matrix, F1)', 'GitHub repo'],
      stepByStep: ['Load and explore dataset', 'Clean and preprocess data', 'Feature engineering', 'Train multiple models', 'Compare accuracy', 'Visualise results', 'Write findings'],
      tags: ['ml', 'python', 'classification', 'scikit-learn'],
    },
    {
      title: 'Design a Mobile App UI in Figma',
      description: 'Create a complete mobile app UI design for a food delivery app. Design all major screens: splash, login, home, item details, cart, and order confirmation.',
      module: 'UI/UX Design', difficulty: 'easy', priority: 'medium', estimatedDays: 6,
      techStack: ['Figma', 'Prototyping', 'Auto Layout', 'Components'],
      deliverables: ['6+ screen designs in Figma', 'Interactive prototype', 'Shareable Figma link', 'Design system (colours, typography, components)'],
      stepByStep: ['Research competitors', 'Create user flow', 'Design wireframes', 'Build hi-fi designs', 'Create components', 'Link screens as prototype', 'Share link'],
      tags: ['figma', 'ui', 'mobile', 'prototype'],
    },
  ];

  const templates = [];
  for (const t of templateData) {
    const tmpl = await TaskTemplate.create({ ...t, module: moduleMap[t.module], createdBy: adminUser._id });
    templates.push(tmpl);
  }
  console.log(`✅ Created ${templates.length} task templates`);

  // ─── Sample Interns ──────────────────────────────────────────────────
  const internData = [
    { name: 'Aarav Mehta', email: 'aarav@intern.com', college: 'IIT Madras', module: 'Frontend Development', mentor: 0, skill: 'beginner' },
    { name: 'Divya Nair', email: 'divya@intern.com', college: 'NIT Trichy', module: 'Backend Development', mentor: 2, skill: 'intermediate' },
    { name: 'Kiran Raj', email: 'kiran@intern.com', college: 'VIT Vellore', module: 'AI and Machine Learning', mentor: 1, skill: 'beginner' },
    { name: 'Sneha Patel', email: 'sneha@intern.com', college: 'BITS Pilani', module: 'UI/UX Design', mentor: 0, skill: 'beginner' },
    { name: 'Rohan Gupta', email: 'rohan@intern.com', college: 'Delhi University', module: 'Full-Stack Development', mentor: 2, skill: 'advanced' },
  ];

  const joiningDate = new Date('2026-10-01');
  const endDate = new Date('2026-12-31');

  for (const d of internData) {
    const user = await User.create({ name: d.name, email: d.email, password: 'Intern@1234', role: 'intern' });
    const intern = await Intern.create({
      user: user._id, name: d.name, email: d.email, college: d.college,
      joiningDate, endDate, duration: 13,
      currentModule: moduleMap[d.module],
      assignedMentor: mentors[d.mentor]._id,
      skillLevel: d.skill,
      totalTasksCount: 1,
    });
    await Mentor.findByIdAndUpdate(mentors[d.mentor]._id, { $addToSet: { assignedInterns: intern._id } });

    // Assign first task from the matching template
    const matchingTemplate = templates.find((t) => t.module.toString() === moduleMap[d.module]?.toString());
    if (matchingTemplate) {
      await TaskAssignment.create({
        intern: intern._id,
        template: matchingTemplate._id,
        title: matchingTemplate.title,
        description: matchingTemplate.description,
        module: matchingTemplate.module,
        difficulty: matchingTemplate.difficulty,
        priority: matchingTemplate.priority,
        techStack: matchingTemplate.techStack,
        deliverables: matchingTemplate.deliverables,
        stepByStep: matchingTemplate.stepByStep,
        startDate: joiningDate,
        deadline: new Date('2026-11-07'),
        assignedBy: adminUser._id,
        mentor: mentors[d.mentor]._id,
        status: 'assigned',
      });
    }
  }
  console.log(`✅ Created ${internData.length} interns (password: Intern@1234)`);

  // ─── Summary ────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════');
  console.log('  🎉 Seed complete! Test credentials:');
  console.log('═══════════════════════════════════════════');
  console.log('  Admin   → admin@company.com / Admin@1234');
  console.log('  Mentor  → rajesh@company.com / Mentor@1234');
  console.log('  Intern  → aarav@intern.com / Intern@1234');
  console.log('═══════════════════════════════════════════\n');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seed error:', err.message);
  process.exit(1);
});
