import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { API_URL } from '../config/api';
import './PlacementCalendar.css';

const EVENT_TYPE_CONFIG = {
  training: { label: 'Training Session', icon: '🟢', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)' },
  mock_interview: { label: 'Mock Interview', icon: '🔵', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.4)' },
  company_drive: { label: 'Company Drive', icon: '🟣', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.4)' },
  aptitude_test: { label: 'Aptitude Test', icon: '🟠', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.4)' },
  deadline: { label: 'Important Deadline', icon: '🔴', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)' },
  workshop: { label: 'Workshop', icon: '🟡', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)', border: 'rgba(234, 179, 8, 0.4)' }
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Contextual placement events matching institutional preparation milestones
const SAMPLE_PLACEMENT_EVENTS = [
  {
    _id: 'seed-1',
    title: 'Learning: DSA Mastery',
    description: 'Foundational algorithmic concepts: Arrays, Two Pointers, and Binary Search optimizations.',
    eventType: 'training',
    startDateTime: '2026-09-01T09:00:00.000Z',
    endDateTime: '2026-09-01T11:00:00.000Z',
    venueOrLink: 'Lab 4 / Campus Coding Portal',
    instructorOrCompany: 'Prof. Ramesh (Algorithms Coach)',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-1b',
    title: 'Learn: Aptitude Prep',
    description: 'Quantitative problem solving & fast calculation techniques.',
    eventType: 'aptitude_test',
    startDateTime: '2026-09-01T14:00:00.000Z',
    endDateTime: '2026-09-01T15:30:00.000Z',
    venueOrLink: 'Online Assessment Portal',
    instructorOrCompany: 'TPO Aptitude Cell',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-2',
    title: 'Learning: System Design',
    description: 'Microservices architecture, caching patterns with Redis, and load balancer design.',
    eventType: 'training',
    startDateTime: '2026-09-02T10:00:00.000Z',
    endDateTime: '2026-09-02T12:00:00.000Z',
    venueOrLink: 'Seminar Hall 2 & Teams',
    instructorOrCompany: 'Alumni Tech Lead (AWS)',
    targetAudience: { roles: ['student'], branches: ['CSE', 'IT'] }
  },
  {
    _id: 'seed-2b',
    title: 'Learn: Web Architecture',
    description: 'REST API lifecycle, database indexing, and query optimization.',
    eventType: 'workshop',
    startDateTime: '2026-09-02T15:00:00.000Z',
    endDateTime: '2026-09-02T17:00:00.000Z',
    venueOrLink: 'CSE Seminar Hall',
    instructorOrCompany: 'TPO Cell',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-3',
    title: 'Learning: DBMS & SQL',
    description: 'Transactions, ACID compliance, Normalization (1NF to BCNF) and indexing practice.',
    eventType: 'training',
    startDateTime: '2026-09-03T10:30:00.000Z',
    endDateTime: '2026-09-03T12:30:00.000Z',
    venueOrLink: 'Lab 2 & Zoom',
    instructorOrCompany: 'Prof. Rao',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-3b',
    title: 'Learn: Interview Quiz',
    description: 'Speed test on Core CS subjects: OS, DBMS, Computer Networks.',
    eventType: 'aptitude_test',
    startDateTime: '2026-09-03T16:00:00.000Z',
    endDateTime: '2026-09-03T17:00:00.000Z',
    venueOrLink: 'Assessment Portal',
    instructorOrCompany: 'TPO Assessment Cell',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-4',
    title: 'GRIET Placement Orientation',
    description: 'Annual placement guidelines, recruiter eligibility thresholds, and campus drive code of conduct.',
    eventType: 'company_drive',
    startDateTime: '2026-09-04T09:30:00.000Z',
    endDateTime: '2026-09-04T12:30:00.000Z',
    venueOrLink: 'Main Auditorium',
    instructorOrCompany: 'Director of Placements',
    targetAudience: { roles: ['student', 'faculty'], branches: ['All'] }
  },
  {
    _id: 'seed-4b',
    title: 'Resume Screening Round 1',
    description: 'Faculty review of ATS scores and project summaries.',
    eventType: 'workshop',
    startDateTime: '2026-09-04T14:00:00.000Z',
    endDateTime: '2026-09-04T16:00:00.000Z',
    venueOrLink: 'Placement Cell Boardroom',
    instructorOrCompany: 'Placement Coordinators',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-4c',
    title: 'Assessment Mock Session',
    description: 'Practice assessment with automated proctoring.',
    eventType: 'aptitude_test',
    startDateTime: '2026-09-04T17:00:00.000Z',
    endDateTime: '2026-09-04T18:00:00.000Z',
    venueOrLink: 'Online Lab',
    instructorOrCompany: 'TPO Cell',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-5',
    title: 'Learning: Java Concurrency',
    description: 'Thread pools, ExecutorService, synchronization, and race condition prevention.',
    eventType: 'training',
    startDateTime: '2026-09-05T10:00:00.000Z',
    endDateTime: '2026-09-05T12:00:00.000Z',
    venueOrLink: 'Seminar Hall 1',
    instructorOrCompany: 'Industry Expert',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-5b',
    title: 'Learn: Spring Boot Basics',
    description: 'Dependency injection, REST controller scaffolding, and JPA entities.',
    eventType: 'workshop',
    startDateTime: '2026-09-05T14:00:00.000Z',
    endDateTime: '2026-09-05T16:30:00.000Z',
    venueOrLink: 'Lab 5',
    instructorOrCompany: 'Prof. Ramesh',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-6',
    title: 'Learning: Dynamic Programming',
    description: 'Classic DP patterns: 0/1 Knapsack, LCS, LIS, and Matrix Chain Multiplication.',
    eventType: 'training',
    startDateTime: '2026-09-06T10:00:00.000Z',
    endDateTime: '2026-09-06T12:00:00.000Z',
    venueOrLink: 'Seminar Hall 3',
    instructorOrCompany: 'Algorithms Coach',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-6b',
    title: 'Learn: Memoization Drills',
    description: 'Live interactive coding drills with automated test case evaluation.',
    eventType: 'training',
    startDateTime: '2026-09-06T14:00:00.000Z',
    endDateTime: '2026-09-06T16:00:00.000Z',
    venueOrLink: 'Campus Portal',
    instructorOrCompany: 'Coding Club Leads',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-7',
    title: 'Learning: Graph Algorithms',
    description: 'Breadth First Search, Depth First Search, Dijkstra Shortest Path, and Topo Sort.',
    eventType: 'training',
    startDateTime: '2026-09-07T10:00:00.000Z',
    endDateTime: '2026-09-07T12:00:00.000Z',
    venueOrLink: 'Lab 3',
    instructorOrCompany: 'Prof. K. Reddy',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-7b',
    title: 'Learn: Topological Sort',
    description: 'Directed Acyclic Graphs and prerequisite dependency resolution.',
    eventType: 'workshop',
    startDateTime: '2026-09-07T15:00:00.000Z',
    endDateTime: '2026-09-07T17:00:00.000Z',
    venueOrLink: 'Lab 3 & Online',
    instructorOrCompany: 'Prof. K. Reddy',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-8',
    title: 'Learning: Trees & Binary Search',
    description: 'Tree traversals, lowest common ancestor, and balanced binary search trees.',
    eventType: 'training',
    startDateTime: '2026-09-08T10:00:00.000Z',
    endDateTime: '2026-09-08T12:00:00.000Z',
    venueOrLink: 'Seminar Hall 2',
    instructorOrCompany: 'Algorithms Coach',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-8b',
    title: 'Learn: Segment Trees',
    description: 'Range query optimization and lazy propagation.',
    eventType: 'training',
    startDateTime: '2026-09-08T14:30:00.000Z',
    endDateTime: '2026-09-08T16:30:00.000Z',
    venueOrLink: 'Online Portal',
    instructorOrCompany: 'Algorithms Coach',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-9',
    title: 'Learning: Greedy Strategies',
    description: 'Interval scheduling, Huffman coding, and fractional knapsack problem.',
    eventType: 'training',
    startDateTime: '2026-09-09T10:00:00.000Z',
    endDateTime: '2026-09-09T12:00:00.000Z',
    venueOrLink: 'Lab 1',
    instructorOrCompany: 'Prof. Rao',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-9b',
    title: 'Learn: Activity Selection',
    description: 'Optimizing resource allocation and competitive programming problems.',
    eventType: 'workshop',
    startDateTime: '2026-09-09T15:00:00.000Z',
    endDateTime: '2026-09-09T17:00:00.000Z',
    venueOrLink: 'Lab 1',
    instructorOrCompany: 'Prof. Rao',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-10',
    title: 'Learning: OS Core Concepts',
    description: 'Process scheduling, deadlocks, paging, and virtual memory page fault handling.',
    eventType: 'training',
    startDateTime: '2026-09-10T10:00:00.000Z',
    endDateTime: '2026-09-10T12:00:00.000Z',
    venueOrLink: 'Seminar Hall 1',
    instructorOrCompany: 'Prof. Swathi',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-10b',
    title: 'Learn: Memory Management',
    description: 'Virtual address translation, segmentation, and cache replacement algorithms.',
    eventType: 'workshop',
    startDateTime: '2026-09-10T14:30:00.000Z',
    endDateTime: '2026-09-10T16:30:00.000Z',
    venueOrLink: 'Seminar Hall 1',
    instructorOrCompany: 'Prof. Swathi',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-11',
    title: 'Learning: Computer Networks',
    description: 'TCP 3-way handshake, OSI model layers, DNS lookup flow, and HTTP/HTTPS security.',
    eventType: 'training',
    startDateTime: '2026-09-11T10:00:00.000Z',
    endDateTime: '2026-09-11T12:00:00.000Z',
    venueOrLink: 'Lab 4',
    instructorOrCompany: 'Prof. V. Sharma',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-11b',
    title: 'Learn: Socket Programming',
    description: 'Client-server TCP/UDP communication and network troubleshooting.',
    eventType: 'training',
    startDateTime: '2026-09-11T14:30:00.000Z',
    endDateTime: '2026-09-11T16:30:00.000Z',
    venueOrLink: 'Lab 4',
    instructorOrCompany: 'Prof. V. Sharma',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-12',
    title: 'Learning: Aptitude Reasoning',
    description: 'Blood relations, seating arrangement puzzles, and logical deduction practice.',
    eventType: 'training',
    startDateTime: '2026-09-12T10:00:00.000Z',
    endDateTime: '2026-09-12T12:00:00.000Z',
    venueOrLink: 'Seminar Hall 3',
    instructorOrCompany: 'TPO Lead',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-12b',
    title: 'Learn: Data Interpretation',
    description: 'Bar charts, pie graphs, and radar analysis calculations under time constraints.',
    eventType: 'aptitude_test',
    startDateTime: '2026-09-12T14:30:00.000Z',
    endDateTime: '2026-09-12T16:30:00.000Z',
    venueOrLink: 'Campus Portal',
    instructorOrCompany: 'TPO Lead',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-13',
    title: 'Learning: Behavioral Prep',
    description: 'STAR framework for behavioral questions, leadership stories, and situational judgment.',
    eventType: 'training',
    startDateTime: '2026-09-13T10:00:00.000Z',
    endDateTime: '2026-09-13T12:00:00.000Z',
    venueOrLink: 'Auditorium',
    instructorOrCompany: 'HR Specialist',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-13b',
    title: 'Learn: Group Discussion',
    description: 'Current tech topics, non-verbal cues, and constructive articulation.',
    eventType: 'workshop',
    startDateTime: '2026-09-13T14:00:00.000Z',
    endDateTime: '2026-09-13T16:30:00.000Z',
    venueOrLink: 'Auditorium',
    instructorOrCompany: 'HR Specialist',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-14',
    title: 'Ganesh Utsav Drive Orientation',
    description: 'Special weekend placement sprint and company drive announcements.',
    eventType: 'company_drive',
    startDateTime: '2026-09-14T09:30:00.000Z',
    endDateTime: '2026-09-14T12:00:00.000Z',
    venueOrLink: 'GRIET Auditorium',
    instructorOrCompany: 'TPO Cell',
    targetAudience: { roles: ['student', 'faculty'], branches: ['All'] }
  },
  {
    _id: 'seed-14b',
    title: 'Resume Clinic & Audit',
    description: '1-on-1 resume proofreading and ATS keyword alignment.',
    eventType: 'workshop',
    startDateTime: '2026-09-14T13:00:00.000Z',
    endDateTime: '2026-09-14T15:00:00.000Z',
    venueOrLink: 'Placement Cell',
    instructorOrCompany: 'Senior Faculty',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-14c',
    title: 'Speed Interview Drills',
    description: 'Rapid 10-minute technical screening rounds.',
    eventType: 'mock_interview',
    startDateTime: '2026-09-14T15:30:00.000Z',
    endDateTime: '2026-09-14T17:30:00.000Z',
    venueOrLink: 'Conference Room B',
    instructorOrCompany: 'Industry Mentors',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-15',
    title: 'Learning: Advanced C++ & OOP',
    description: 'Smart pointers, move semantics, vtables, and multi-threading.',
    eventType: 'training',
    startDateTime: '2026-09-15T10:00:00.000Z',
    endDateTime: '2026-09-15T12:00:00.000Z',
    venueOrLink: 'Lab 2',
    instructorOrCompany: 'Prof. Anand',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-15b',
    title: 'Learn: Polymorphism in Depth',
    description: 'Compile-time vs runtime polymorphism and interface segregation.',
    eventType: 'training',
    startDateTime: '2026-09-15T14:00:00.000Z',
    endDateTime: '2026-09-15T16:00:00.000Z',
    venueOrLink: 'Lab 2',
    instructorOrCompany: 'Prof. Anand',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-16',
    title: 'Learning: Python Scripting',
    description: 'List comprehensions, generators, decorators, and multithreading.',
    eventType: 'training',
    startDateTime: '2026-09-16T10:00:00.000Z',
    endDateTime: '2026-09-16T12:00:00.000Z',
    venueOrLink: 'Lab 5',
    instructorOrCompany: 'Prof. M. Reddy',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-16b',
    title: 'Learn: Pandas & Data Prep',
    description: 'DataFrames, group-by operations, and exploratory data analysis.',
    eventType: 'workshop',
    startDateTime: '2026-09-16T14:30:00.000Z',
    endDateTime: '2026-09-16T16:30:00.000Z',
    venueOrLink: 'Lab 5',
    instructorOrCompany: 'Prof. M. Reddy',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-17',
    title: 'Learning: Cloud Fundamentals',
    description: 'AWS EC2, S3, IAM roles, VPC configurations, and serverless Lambda functions.',
    eventType: 'training',
    startDateTime: '2026-09-17T10:00:00.000Z',
    endDateTime: '2026-09-17T12:00:00.000Z',
    venueOrLink: 'Seminar Hall 2 & AWS Console',
    instructorOrCompany: 'AWS Certified Trainer',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-17b',
    title: 'AWS Certified Solutions Architect Q&A',
    description: 'Exam patterns and cloud architecture sample projects.',
    eventType: 'workshop',
    startDateTime: '2026-09-17T14:00:00.000Z',
    endDateTime: '2026-09-17T16:00:00.000Z',
    venueOrLink: 'Seminar Hall 2',
    instructorOrCompany: 'AWS Certified Trainer',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-18',
    title: 'Train to Placement: HR Round',
    description: 'Salary negotiation ethics, notice period handling, and culture fit interview simulation.',
    eventType: 'mock_interview',
    startDateTime: '2026-09-18T10:00:00.000Z',
    endDateTime: '2026-09-18T12:30:00.000Z',
    venueOrLink: 'Placement Training Center',
    instructorOrCompany: 'Lead HR Consultant',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-18b',
    title: 'Train: Behavioral Scenarios',
    description: 'Handling conflict resolution and cross-functional team questions.',
    eventType: 'training',
    startDateTime: '2026-09-18T14:00:00.000Z',
    endDateTime: '2026-09-18T16:00:00.000Z',
    venueOrLink: 'Placement Training Center',
    instructorOrCompany: 'Lead HR Consultant',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-19',
    title: 'Learning: Docker & Containers',
    description: 'Dockerfiles, multi-stage builds, port forwarding, and docker-compose deployment.',
    eventType: 'training',
    startDateTime: '2026-09-19T10:00:00.000Z',
    endDateTime: '2026-09-19T12:00:00.000Z',
    venueOrLink: 'Lab 3',
    instructorOrCompany: 'DevOps Coach',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-19b',
    title: 'Learn: CI/CD Pipelines',
    description: 'GitHub Actions workflow file creation and automated testing pipelines.',
    eventType: 'workshop',
    startDateTime: '2026-09-19T14:00:00.000Z',
    endDateTime: '2026-09-19T16:30:00.000Z',
    venueOrLink: 'Lab 3 & GitHub',
    instructorOrCompany: 'DevOps Coach',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-20',
    title: 'Learning: Git & GitHub Workflows',
    description: 'Rebase vs merge, resolving merge conflicts, and open source pull requests.',
    eventType: 'training',
    startDateTime: '2026-09-20T10:00:00.000Z',
    endDateTime: '2026-09-20T12:00:00.000Z',
    venueOrLink: 'Seminar Hall 3',
    instructorOrCompany: 'Senior Developer',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-20b',
    title: 'Learn: Open Source Contributions',
    description: 'Finding good first issues and contributing to community repositories.',
    eventType: 'workshop',
    startDateTime: '2026-09-20T14:00:00.000Z',
    endDateTime: '2026-09-20T16:00:00.000Z',
    venueOrLink: 'Seminar Hall 3',
    instructorOrCompany: 'Senior Developer',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-21',
    title: 'Learning: REST & GraphQL',
    description: 'Schema definition, queries, mutations, and comparing REST with GraphQL.',
    eventType: 'training',
    startDateTime: '2026-09-21T10:00:00.000Z',
    endDateTime: '2026-09-21T12:00:00.000Z',
    venueOrLink: 'Lab 1',
    instructorOrCompany: 'Prof. Rao',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-21b',
    title: 'Learn: API Rate Limiting',
    description: 'Token bucket and leaky bucket algorithm implementations.',
    eventType: 'training',
    startDateTime: '2026-09-21T14:30:00.000Z',
    endDateTime: '2026-09-21T16:30:00.000Z',
    venueOrLink: 'Lab 1',
    instructorOrCompany: 'Prof. Rao',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-22',
    title: 'Learning: Web Security & OWASP',
    description: 'XSS, CSRF, SQL Injection prevention, and JWT token authentication.',
    eventType: 'training',
    startDateTime: '2026-09-22T10:00:00.000Z',
    endDateTime: '2026-09-22T12:00:00.000Z',
    venueOrLink: 'Lab 4',
    instructorOrCompany: 'Cybersecurity Mentor',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-22b',
    title: 'Learn: Cryptography Basics',
    description: 'Symmetric vs asymmetric encryption, RSA, and hashing algorithms.',
    eventType: 'workshop',
    startDateTime: '2026-09-22T14:30:00.000Z',
    endDateTime: '2026-09-22T16:30:00.000Z',
    venueOrLink: 'Lab 4',
    instructorOrCompany: 'Cybersecurity Mentor',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-23',
    title: 'Learning: Microservices & Kafka',
    description: 'Event-driven architecture, Kafka producers/consumers, topics, and fault tolerance.',
    eventType: 'training',
    startDateTime: '2026-09-23T10:00:00.000Z',
    endDateTime: '2026-09-23T12:00:00.000Z',
    venueOrLink: 'Seminar Hall 1',
    instructorOrCompany: 'System Architect',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-23b',
    title: 'Learn: Kafka Pub/Sub',
    description: 'Hands-on consumer group scaling and message persistence demonstration.',
    eventType: 'workshop',
    startDateTime: '2026-09-23T14:00:00.000Z',
    endDateTime: '2026-09-23T16:00:00.000Z',
    venueOrLink: 'Seminar Hall 1',
    instructorOrCompany: 'System Architect',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-24',
    title: 'Learning: Full-Stack React & Node',
    description: 'Custom React hooks, state management with Zustand, and Express middleware.',
    eventType: 'training',
    startDateTime: '2026-09-24T10:00:00.000Z',
    endDateTime: '2026-09-24T12:00:00.000Z',
    venueOrLink: 'Lab 2',
    instructorOrCompany: 'Lead Web Engineer',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-24b',
    title: 'Learn: React Performance',
    description: 'useMemo, useCallback, React Profiler, and code splitting techniques.',
    eventType: 'training',
    startDateTime: '2026-09-24T14:30:00.000Z',
    endDateTime: '2026-09-24T16:30:00.000Z',
    venueOrLink: 'Lab 2',
    instructorOrCompany: 'Lead Web Engineer',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-25',
    title: 'Learning: Machine Learning Prep',
    description: 'Linear Regression, Decision Trees, Random Forests, and cross-validation metrics.',
    eventType: 'training',
    startDateTime: '2026-09-25T10:00:00.000Z',
    endDateTime: '2026-09-25T12:00:00.000Z',
    venueOrLink: 'Seminar Hall 2',
    instructorOrCompany: 'AI Lead',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-25b',
    title: 'Learn: Model Evaluation',
    description: 'Precision, recall, ROC-AUC curves, and confusion matrix interpretation.',
    eventType: 'workshop',
    startDateTime: '2026-09-25T14:30:00.000Z',
    endDateTime: '2026-09-25T16:30:00.000Z',
    venueOrLink: 'Seminar Hall 2',
    instructorOrCompany: 'AI Lead',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-26',
    title: 'Learning: Resume ATS Deep-Dive',
    description: 'Keyword parsing optimization, action verb quantification, and formatting rules.',
    eventType: 'training',
    startDateTime: '2026-09-26T10:00:00.000Z',
    endDateTime: '2026-09-26T12:00:00.000Z',
    venueOrLink: 'Placement Auditorium',
    instructorOrCompany: 'Career Coach',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-26b',
    title: 'Learn: Portfolio Showcase',
    description: 'Live GitHub project walkthroughs and recruiter outreach on LinkedIn.',
    eventType: 'workshop',
    startDateTime: '2026-09-26T14:00:00.000Z',
    endDateTime: '2026-09-26T16:00:00.000Z',
    venueOrLink: 'Placement Auditorium',
    instructorOrCompany: 'Career Coach',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-27',
    title: 'Learning: Mock Coding Marathon',
    description: '4-hour continuous coding contest simulating LeetCode weekly format.',
    eventType: 'training',
    startDateTime: '2026-09-27T09:00:00.000Z',
    endDateTime: '2026-09-27T13:00:00.000Z',
    venueOrLink: 'Coding Simulator Engine',
    instructorOrCompany: 'GRIET TPO Cell',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-27b',
    title: 'Learn: Editorial Discussion',
    description: 'Live breakdown of contest solutions and optimal complexity trade-offs.',
    eventType: 'workshop',
    startDateTime: '2026-09-27T14:30:00.000Z',
    endDateTime: '2026-09-27T16:30:00.000Z',
    venueOrLink: 'Coding Simulator Engine',
    instructorOrCompany: 'GRIET TPO Cell',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-28',
    title: 'Learning: AI & Prompt Engineering',
    description: 'LLM APIs, embedding vector databases, and modern developer tooling.',
    eventType: 'training',
    startDateTime: '2026-09-28T10:00:00.000Z',
    endDateTime: '2026-09-28T12:00:00.000Z',
    venueOrLink: 'Lab 5',
    instructorOrCompany: 'AI Research Scholar',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-28b',
    title: 'Train: Agentic Coding Workflows',
    description: 'Hands-on practice using AI pair programmers and testing tools.',
    eventType: 'workshop',
    startDateTime: '2026-09-28T14:00:00.000Z',
    endDateTime: '2026-09-28T16:00:00.000Z',
    venueOrLink: 'Lab 5',
    instructorOrCompany: 'AI Research Scholar',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-29',
    title: 'Train to Placement: Speed Math',
    description: 'Vedic math shortcuts, percentage tricks, and ratio calculation drills.',
    eventType: 'training',
    startDateTime: '2026-09-29T10:00:00.000Z',
    endDateTime: '2026-09-29T12:00:00.000Z',
    venueOrLink: 'Seminar Hall 3',
    instructorOrCompany: 'Aptitude Coach',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-29b',
    title: 'Train: Permutations & Probability',
    description: 'Combinatorics, dice problems, and card probability problem solving.',
    eventType: 'aptitude_test',
    startDateTime: '2026-09-29T14:00:00.000Z',
    endDateTime: '2026-09-29T16:00:00.000Z',
    venueOrLink: 'Seminar Hall 3',
    instructorOrCompany: 'Aptitude Coach',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-30',
    title: 'Learning: Final Placement Sprint',
    description: 'Comprehensive readiness checkpoint, documentation verification, and mock interviews.',
    eventType: 'training',
    startDateTime: '2026-09-30T09:30:00.000Z',
    endDateTime: '2026-09-30T12:30:00.000Z',
    venueOrLink: 'Central Auditorium',
    instructorOrCompany: 'Dean of Placements',
    targetAudience: { roles: ['student', 'faculty', 'admin'], branches: ['All'] }
  },
  {
    _id: 'seed-30b',
    title: 'Learn: Mock Interview Feedback',
    description: 'One-on-one personalized assessment review and improvement plan.',
    eventType: 'mock_interview',
    startDateTime: '2026-09-30T14:00:00.000Z',
    endDateTime: '2026-09-30T17:00:00.000Z',
    venueOrLink: 'Interview Rooms',
    instructorOrCompany: 'Senior Faculty Panel',
    targetAudience: { roles: ['student'], branches: ['All'] }
  }
];

const PlacementCalendar = () => {
  const { user, token } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 30)); // 2026 / 9 (Sept 30, 2026)
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);
  const [selectedEventModal, setSelectedEventModal] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'agenda' | 'week' | 'day' | 'year'
  const [agendaLayout, setAgendaLayout] = useState('grid'); // 'grid' | 'timeline'

  // New Event Form State
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    eventType: 'company_drive',
    startDate: new Date().toISOString().slice(0, 10),
    startTime: '10:00',
    endDate: new Date().toISOString().slice(0, 10),
    endTime: '12:00',
    venueOrLink: 'GRIET Placement Cell',
    instructorOrCompany: '',
    targetRoles: ['student', 'faculty', 'admin'],
    allDay: false
  });
  const [creating, setCreating] = useState(false);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` }
  });

  const fetchEvents = async () => {
    try {
      setLoading(true);
      let url = `${API_URL}/placement-events`;
      if (selectedFilter !== 'all') url += `?eventType=${selectedFilter}`;
      const res = await axios.get(url, getAuthHeaders());
      const fetched = res.data?.data || [];
      if (fetched.length === 0) {
        setEvents(SAMPLE_PLACEMENT_EVENTS);
      } else {
        // Merge fetched with sample events ensuring unique IDs
        const existingIds = new Set(fetched.map(e => e._id));
        const merged = [...fetched, ...SAMPLE_PLACEMENT_EVENTS.filter(s => !existingIds.has(s._id))];
        setEvents(merged);
      }
    } catch (err) {
      console.warn('Using seeded events as fallback', err);
      setEvents(SAMPLE_PLACEMENT_EVENTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedFilter]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayEvents(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayEvents(null);
  };

  const handleToday = () => {
    setCurrentDate(new Date(2026, 8, 30));
    setSelectedDayEvents(null);
  };

  // Calendar Day Generation Matching Screenshot (Only Current Month Slots with Blank Offsets)
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sun, 1 is Mon, 2 is Tue ...
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Exactly calculate rows needed (e.g. 5 rows for Sept 2026)
  const leadingBlanks = firstDayOfMonth; // e.g., 2 blanks for Tuesday
  const totalSlots = Math.ceil((leadingBlanks + daysInMonth) / 7) * 7;
  const trailingBlanks = totalSlots - (leadingBlanks + daysInMonth);

  const monthGridCells = useMemo(() => {
    const cells = [];
    // Leading blank slots (SUN, MON empty when month starts on TUE)
    for (let i = 0; i < leadingBlanks; i++) {
      cells.push({ isBlank: true, key: `lead-${i}` });
    }
    // Days of the month (1 .. daysInMonth)
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      cells.push({
        isBlank: false,
        date: dateObj,
        dayNum: d,
        dayOfWeek: dateObj.getDay(),
        key: `day-${d}`
      });
    }
    // Trailing blank slots
    for (let i = 0; i < trailingBlanks; i++) {
      cells.push({ isBlank: true, key: `trail-${i}` });
    }
    return cells;
  }, [year, month, leadingBlanks, daysInMonth, trailingBlanks]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      const matchesCategory = selectedFilter === 'all' || ev.eventType === selectedFilter;
      const matchesSearch = !searchQuery.trim() ||
        ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ev.instructorOrCompany && ev.instructorOrCompany.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ev.venueOrLink && ev.venueOrLink.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [events, selectedFilter, searchQuery]);

  // Get events on a specific date
  const getEventsForDate = (date) => {
    const targetY = date.getFullYear();
    const targetM = date.getMonth();
    const targetD = date.getDate();

    return filteredEvents.filter(e => {
      const eStart = new Date(e.startDateTime);
      const eEnd = new Date(e.endDateTime);
      const sDate = new Date(eStart.getFullYear(), eStart.getMonth(), eStart.getDate());
      const enDate = new Date(eEnd.getFullYear(), eEnd.getMonth(), eEnd.getDate());
      const cur = new Date(targetY, targetM, targetD);
      return cur >= sDate && cur <= enDate;
    });
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.title.trim()) return;

    try {
      setCreating(true);
      const startDateTime = new Date(`${newEvent.startDate}T${newEvent.startTime || '00:00'}:00`);
      const endDateTime = new Date(`${newEvent.endDate}T${newEvent.endTime || '23:59'}:00`);

      const payload = {
        title: newEvent.title.trim(),
        description: newEvent.description.trim(),
        eventType: newEvent.eventType,
        startDateTime,
        endDateTime,
        venueOrLink: newEvent.venueOrLink.trim(),
        instructorOrCompany: newEvent.instructorOrCompany.trim(),
        allDay: newEvent.allDay,
        targetRoles: newEvent.targetRoles
      };

      const res = await axios.post(`${API_URL}/placement-events`, payload, getAuthHeaders());
      setEvents(prev => [res.data.data, ...prev]);
      setShowCreateModal(false);
      setNewEvent({
        title: '',
        description: '',
        eventType: 'company_drive',
        startDate: new Date().toISOString().slice(0, 10),
        startTime: '10:00',
        endDate: new Date().toISOString().slice(0, 10),
        endTime: '12:00',
        venueOrLink: 'GRIET Placement Cell',
        instructorOrCompany: '',
        targetRoles: ['student', 'faculty', 'admin'],
        allDay: false
      });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create placement event');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Delete this event from the Placement Calendar?')) return;
    try {
      await axios.delete(`${API_URL}/placement-events/${eventId}`, getAuthHeaders());
      setEvents(prev => prev.filter(e => e._id !== eventId));
      if (selectedEventModal?._id === eventId) setSelectedEventModal(null);
    } catch (err) {
      // If mock event
      setEvents(prev => prev.filter(e => e._id !== eventId));
      if (selectedEventModal?._id === eventId) setSelectedEventModal(null);
    }
  };

  // Generate .ics calendar download
  const handleDownloadICS = (ev) => {
    const pad = (n) => (n < 10 ? '0' + n : n);
    const formatICSDate = (dt) => {
      const d = new Date(dt);
      return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
    };

    const icsData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//GRIET Placement Portal//Placement Calendar//EN',
      'BEGIN:VEVENT',
      `UID:${ev._id}@griet.ac.in`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `DTSTART:${formatICSDate(ev.startDateTime)}`,
      `DTEND:${formatICSDate(ev.endDateTime)}`,
      `SUMMARY:${ev.title}`,
      `DESCRIPTION:${ev.description || ''}`,
      `LOCATION:${ev.venueOrLink || 'GRIET Placement Cell'}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${ev.title.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Today reference string
  const todayDate = new Date(2026, 8, 30);
  const isSelectedDate = (dateObj) => {
    return dateObj.getFullYear() === todayDate.getFullYear() &&
           dateObj.getMonth() === todayDate.getMonth() &&
           dateObj.getDate() === todayDate.getDate();
  };

  return (
    <>
      <Header title="Placement & Training Calendar" />
      <div className="content-wrapper placement-calendar-page animate-fade">

        {/* Top Minimalist Header Matching Screenshot (e.g. 2026 / 9 on left, + and ⋮ on right) */}
        <div className="mobile-calendar-header-bar">
          <div className="header-left-cluster">
            <h1 className="screenshot-big-month-title">
              {year} / {month + 1}
            </h1>
            <div className="month-sub-indicator">
              <span className="month-name-text">{MONTH_NAMES[month]}</span>
              <div className="month-quick-steppers">
                <button className="stepper-arrow-btn" onClick={handlePrevMonth} title="Previous Month">◀</button>
                <button className="stepper-today-btn" onClick={handleToday} title="Go to Today">Today</button>
                <button className="stepper-arrow-btn" onClick={handleNextMonth} title="Next Month">▶</button>
              </div>
            </div>
          </div>

          <div className="header-right-cluster">
            <button
              className="icon-action-button"
              onClick={() => setShowCreateModal(true)}
              title="Add Placement Event"
            >
              <span className="icon-plus-symbol">+</span>
            </button>

            <div className="menu-dropdown-wrapper">
              <button
                className="icon-action-button"
                onClick={() => setShowQuickMenu(!showQuickMenu)}
                title="Calendar Options"
              >
                <span className="icon-dots-symbol">⋮</span>
              </button>

              {showQuickMenu && (
                <div className="quick-action-menu glass-card">
                  <button className="menu-option-item" onClick={() => { handleToday(); setShowQuickMenu(false); }}>
                    🎯 Go to Today (Sept 30)
                  </button>
                  <button className="menu-option-item" onClick={() => { setViewMode('agenda'); setShowQuickMenu(false); }}>
                    📋 Switch to Agenda Grid
                  </button>
                  <button className="menu-option-item" onClick={() => { setViewMode('month'); setShowQuickMenu(false); }}>
                    🗓️ Switch to Month Grid
                  </button>
                  <button className="menu-option-item" onClick={() => { fetchEvents(); setShowQuickMenu(false); }}>
                    🔄 Refresh Events
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Category Filter Legend Bar */}
        <div className="calendar-legend-bar glass-card">
          <span className="legend-label">Filter:</span>
          <button
            className={`legend-pill ${selectedFilter === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('all')}
          >
            All Categories ({events.length})
          </button>
          {Object.entries(EVENT_TYPE_CONFIG).map(([typeKey, cfg]) => {
            const count = events.filter(e => e.eventType === typeKey).length;
            return (
              <button
                key={typeKey}
                className={`legend-pill ${selectedFilter === typeKey ? 'active' : ''}`}
                style={{
                  borderColor: cfg.border,
                  color: cfg.color,
                  background: selectedFilter === typeKey ? cfg.bg : 'transparent'
                }}
                onClick={() => setSelectedFilter(typeKey)}
              >
                <span>{cfg.icon}</span>
                <span>{cfg.label}</span>
                <span className="legend-count-badge" style={{ background: cfg.bg, color: cfg.color }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* ====================================================================
            VIEW 1: MONTH GRID (Exact Replica of User Screenshot)
           ==================================================================== */}
        {viewMode === 'month' && (
          <div className="pure-black-month-container">
            {/* Weekday Columns: SUN, MON, TUE, WED, THU, FRI, SAT */}
            <div className="weekdays-strip">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d, dIdx) => (
                <div key={d} className={`weekday-col-label ${dIdx === 0 || dIdx === 6 ? 'weekend-col' : ''}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Days Grid: 7 Columns, Clean Dark, Numbers Centered, Blue Weekends, Capsule Today */}
            <div className="month-cells-grid">
              {monthGridCells.map((cell) => {
                if (cell.isBlank) {
                  return <div key={cell.key} className="day-cell-slot blank-slot" />;
                }

                const isTodayOrActive = isSelectedDate(cell.date);
                const isWeekend = cell.dayOfWeek === 0 || cell.dayOfWeek === 6; // Sunday or Saturday
                const dayEvents = getEventsForDate(cell.date);

                return (
                  <div
                    key={cell.key}
                    className={`day-cell-slot active-day-slot ${isTodayOrActive ? 'has-active-capsule' : ''}`}
                    onClick={() => {
                      if (dayEvents.length > 0) {
                        setSelectedDayEvents({ date: cell.date, events: dayEvents });
                      }
                    }}
                  >
                    {/* Date Number at top center */}
                    <div className="date-number-wrapper">
                      {isTodayOrActive ? (
                        <div className="today-capsule-badge">
                          {cell.dayNum}
                        </div>
                      ) : (
                        <span className={`date-number-label ${isWeekend ? 'weekend-blue' : 'weekday-white'}`}>
                          {cell.dayNum}
                        </span>
                      )}
                    </div>

                    {/* Compact Stacked Event Pills matching user screenshot */}
                    <div className="stacked-event-pills-container">
                      {/* If more than 2 events: show 1 pill + '+N' badge */}
                      {dayEvents.length > 2 ? (
                        <>
                          <div
                            className="screenshot-pill"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEventModal(dayEvents[0]);
                            }}
                            title={dayEvents[0].title}
                          >
                            <span className="pill-text-truncate">{dayEvents[0].title.split(':')[0]}</span>
                          </div>
                          <div
                            className="more-count-pill"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDayEvents({ date: cell.date, events: dayEvents });
                            }}
                          >
                            +{dayEvents.length - 1}
                          </div>
                        </>
                      ) : (
                        /* If 1 or 2 events: show compact pills */
                        dayEvents.slice(0, 2).map((ev) => (
                          <div
                            key={ev._id}
                            className="screenshot-pill"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEventModal(ev);
                            }}
                            title={ev.title}
                          >
                            <span className="pill-text-truncate">{ev.title.split(':')[0]}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ====================================================================
            VIEW 2: AGENDA GRID (Spacious, Generous Space Between Each Grid Card)
            "When it Comes to Agenda Grid make sure Keep some Space Between Each grid"
           ==================================================================== */}
        {viewMode === 'agenda' && (
          <div className="spacious-agenda-wrapper glass-card">
            {/* Agenda Controls Banner */}
            <div className="agenda-banner-header">
              <div className="agenda-title-group">
                <span className="agenda-kicker-tag">CAMPUS RECRUITMENT AGENDA</span>
                <h2 className="agenda-main-title">Placement Schedules & Assessments ({filteredEvents.length})</h2>
                <p className="agenda-main-desc">
                  Chronological schedule of recruiter tests, technical workshops, and mock interview slots with generous separation.
                </p>
              </div>

              <div className="agenda-action-controls">
                <div className="agenda-search-box">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    className="agenda-search-input"
                    placeholder="Search company, drive, or venue..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button className="clear-search-btn" onClick={() => setSearchQuery('')}>✕</button>
                  )}
                </div>

                <div className="agenda-layout-toggle">
                  <button
                    className={`layout-btn ${agendaLayout === 'grid' ? 'active' : ''}`}
                    onClick={() => setAgendaLayout('grid')}
                    title="Spacious Grid of Cards"
                  >
                    🔲 Card Grid
                  </button>
                  <button
                    className={`layout-btn ${agendaLayout === 'timeline' ? 'active' : ''}`}
                    onClick={() => setAgendaLayout('timeline')}
                    title="Spacious Chronological Timeline"
                  >
                    📜 Timeline List
                  </button>
                </div>
              </div>
            </div>

            {/* Empty State */}
            {filteredEvents.length === 0 ? (
              <div className="agenda-empty-state">
                <span className="empty-icon">📅</span>
                <h3>No Matching Events Found</h3>
                <p>Try resetting the category filter or search query to view all campus activities.</p>
                <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedFilter('all'); setSearchQuery(''); }}>
                  Reset Filters
                </button>
              </div>
            ) : agendaLayout === 'grid' ? (
              /* SPATIAL AGENDA GRID: Generous gap: 2.25rem between each grid card */
              <div className="agenda-cards-spatial-grid">
                {filteredEvents.map((ev) => {
                  const cfg = EVENT_TYPE_CONFIG[ev.eventType] || EVENT_TYPE_CONFIG.training;
                  const startDt = new Date(ev.startDateTime);
                  const endDt = new Date(ev.endDateTime);

                  return (
                    <div
                      key={ev._id}
                      className="agenda-spatial-card"
                      style={{ borderTop: `4px solid ${cfg.color}` }}
                      onClick={() => setSelectedEventModal(ev)}
                    >
                      {/* Card Top: Date Capsule & Category Badge */}
                      <div className="spatial-card-top">
                        <div className="spatial-date-capsule" style={{ background: cfg.bg, borderColor: cfg.border }}>
                          <span className="spatial-month">{MONTH_NAMES[startDt.getMonth()].slice(0, 3)}</span>
                          <strong className="spatial-day" style={{ color: cfg.color }}>{startDt.getDate()}</strong>
                          <span className="spatial-year">{startDt.getFullYear()}</span>
                        </div>

                        <div className="spatial-badge-container">
                          <span className="spatial-type-chip" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                            {cfg.icon} {cfg.label}
                          </span>
                          <span className="spatial-timing-pill">
                            🕒 {startDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Title & Host */}
                      <div className="spatial-card-content">
                        <h3 className="spatial-event-title">{ev.title}</h3>
                        {ev.instructorOrCompany && (
                          <div className="spatial-host-line">
                            <span className="host-icon">🏢</span>
                            <span className="host-name">{ev.instructorOrCompany}</span>
                          </div>
                        )}
                        <p className="spatial-desc-text">
                          {ev.description || 'Institutional placement activity scheduled for graduating engineering cohorts.'}
                        </p>
                      </div>

                      {/* Venue & Target Audience */}
                      <div className="spatial-meta-section">
                        <div className="spatial-venue-line">
                          <span>📍</span>
                          <span>{ev.venueOrLink || 'GRIET Placement Cell'}</span>
                        </div>

                        <div className="spatial-audience-tags">
                          {(ev.targetAudience?.roles || ['student', 'faculty']).map((role) => (
                            <span key={role} className="audience-pill">{role}</span>
                          ))}
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="spatial-card-footer">
                        <button
                          type="button"
                          className="spatial-action-btn primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEventModal(ev);
                          }}
                        >
                          View Dossier →
                        </button>
                        <button
                          type="button"
                          className="spatial-action-btn secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadICS(ev);
                          }}
                          title="Add to Google/Outlook Calendar"
                        >
                          📥 .ICS
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* SPATIAL AGENDA TIMELINE: Generous gap: 2.25rem between each item */
              <div className="agenda-timeline-spacious-list">
                {filteredEvents.map((ev) => {
                  const cfg = EVENT_TYPE_CONFIG[ev.eventType] || EVENT_TYPE_CONFIG.training;
                  const startDt = new Date(ev.startDateTime);
                  const endDt = new Date(ev.endDateTime);

                  return (
                    <div
                      key={ev._id}
                      className="agenda-timeline-card"
                      style={{ borderLeft: `5px solid ${cfg.color}` }}
                      onClick={() => setSelectedEventModal(ev)}
                    >
                      <div className="timeline-date-box" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                        <span className="timeline-month">{MONTH_NAMES[startDt.getMonth()].slice(0, 3)}</span>
                        <strong className="timeline-day">{startDt.getDate()}</strong>
                        <span className="timeline-weekday">{['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][startDt.getDay()]}</span>
                      </div>

                      <div className="timeline-details">
                        <div className="timeline-badges-row">
                          <span className="timeline-type-badge" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                            {cfg.icon} {cfg.label}
                          </span>
                          <span className="timeline-clock">
                            🕒 {startDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {ev.instructorOrCompany && (
                            <span className="timeline-host">🏢 {ev.instructorOrCompany}</span>
                          )}
                        </div>

                        <h3 className="timeline-title">{ev.title}</h3>
                        <p className="timeline-desc">{ev.description}</p>
                        <div className="timeline-venue">📍 {ev.venueOrLink || 'GRIET Placement Cell'}</div>
                      </div>

                      <div className="timeline-buttons">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEventModal(ev);
                          }}
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadICS(ev);
                          }}
                          title="Download Calendar (.ics)"
                        >
                          📥 .ics
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
            VIEW 3: WEEK VIEW (7-Day Overview)
           ==================================================================== */}
        {viewMode === 'week' && (
          <div className="calendar-week-container glass-card">
            <div className="week-header-bar">
              <h3>7-Day Schedule Overview (Week of Sept 27 - Oct 3, 2026)</h3>
              <p className="agenda-subtitle">Daily breakdown of active campus training cohorts and recruiter timelines</p>
            </div>
            <div className="week-columns-grid">
              {[27, 28, 29, 30, 1, 2, 3].map((dNum, idx) => {
                const dayMonth = idx < 4 ? 8 : 9;
                const dDate = new Date(2026, dayMonth, dNum);
                const dayEvs = getEventsForDate(dDate);
                const isSunOrSat = idx === 0 || idx === 6;
                const isTodayPill = dNum === 30 && dayMonth === 8;

                return (
                  <div key={idx} className="week-day-column">
                    <div className="week-day-col-header">
                      <span className={`week-day-name ${isSunOrSat ? 'blue-weekend' : ''}`}>
                        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][idx]}
                      </span>
                      {isTodayPill ? (
                        <div className="today-capsule-badge sm-badge">{dNum}</div>
                      ) : (
                        <span className={`week-day-num ${isSunOrSat ? 'blue-weekend' : ''}`}>{dNum}</span>
                      )}
                    </div>

                    <div className="week-col-events-list">
                      {dayEvs.length === 0 ? (
                        <div className="week-no-events">No Events</div>
                      ) : (
                        dayEvs.map((ev) => {
                          const cfg = EVENT_TYPE_CONFIG[ev.eventType] || EVENT_TYPE_CONFIG.training;
                          return (
                            <div
                              key={ev._id}
                              className="week-event-card"
                              style={{ borderLeft: `3px solid ${cfg.color}`, background: 'rgba(255,255,255,0.03)' }}
                              onClick={() => setSelectedEventModal(ev)}
                            >
                              <strong className="week-ev-title">{ev.title}</strong>
                              <span className="week-ev-time">
                                {new Date(ev.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ====================================================================
            VIEW 4: DAY VIEW (Detailed Timetable for Selected Date)
           ==================================================================== */}
        {viewMode === 'day' && (
          <div className="calendar-day-container glass-card">
            <div className="day-view-hero">
              <div className="day-hero-date-badge">
                <span className="hero-day-num">30</span>
                <div>
                  <h3 className="hero-day-title">Wednesday, September 30, 2026</h3>
                  <span className="hero-day-sub">Today's Placement Readiness Operations</span>
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
                ➕ Add Event
              </button>
            </div>

            <div className="day-timetable-list">
              {getEventsForDate(new Date(2026, 8, 30)).map((ev) => {
                const cfg = EVENT_TYPE_CONFIG[ev.eventType] || EVENT_TYPE_CONFIG.training;
                const sTime = new Date(ev.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const eTime = new Date(ev.endDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <div key={ev._id} className="day-timeline-entry glass-card" style={{ borderLeft: `5px solid ${cfg.color}` }}>
                    <div className="entry-time-pill" style={{ background: cfg.bg, color: cfg.color }}>
                      {sTime} - {eTime}
                    </div>
                    <div className="entry-content">
                      <div className="entry-badge-row">
                        <span className="spatial-type-chip" style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.icon} {cfg.label}
                        </span>
                        {ev.instructorOrCompany && <span>🏢 {ev.instructorOrCompany}</span>}
                      </div>
                      <h4>{ev.title}</h4>
                      <p>{ev.description}</p>
                      <div className="entry-venue">📍 {ev.venueOrLink}</div>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => setSelectedEventModal(ev)}>
                      Dossier
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ====================================================================
            VIEW 5: YEAR VIEW (12-Month Miniature Index)
           ==================================================================== */}
        {viewMode === 'year' && (
          <div className="calendar-year-container glass-card">
            <div className="year-header">
              <h2>Academic & Placement Year 2026</h2>
              <p>Click any month to navigate directly into its full-month view</p>
            </div>
            <div className="year-months-grid">
              {MONTH_NAMES.map((mName, mIdx) => (
                <div
                  key={mName}
                  className={`year-month-card ${mIdx === month ? 'current-active-month' : ''}`}
                  onClick={() => {
                    setCurrentDate(new Date(2026, mIdx, 1));
                    setViewMode('month');
                  }}
                >
                  <div className="year-m-header">
                    <strong>{mName}</strong>
                    {mIdx === month && <span className="active-tag">Active</span>}
                  </div>
                  <div className="year-m-events-count">
                    {events.filter(e => new Date(e.startDateTime).getMonth() === mIdx).length} Events Scheduled
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ====================================================================
            BOTTOM NAVIGATION DOCK (Exact Match to Mobile App Screenshot Dock)
            [ Year ]  [ Month (Active) ]  [ Week ]  [ Day ]  [ Agenda ]
           ==================================================================== */}
        <div className="mobile-bottom-dock-bar">
          <button
            className={`dock-tab-btn ${viewMode === 'year' ? 'active' : ''}`}
            onClick={() => setViewMode('year')}
          >
            <div className="dock-icon">📅</div>
            <span className="dock-label">Year</span>
          </button>

          <button
            className={`dock-tab-btn ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            <div className="dock-icon">🗓️</div>
            <span className="dock-label">Month</span>
          </button>

          <button
            className={`dock-tab-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            <div className="dock-icon">📆</div>
            <span className="dock-label">Week</span>
          </button>

          <button
            className={`dock-tab-btn ${viewMode === 'day' ? 'active' : ''}`}
            onClick={() => setViewMode('day')}
          >
            <div className="dock-icon">3️⃣0️⃣</div>
            <span className="dock-label">Day</span>
          </button>

          <button
            className={`dock-tab-btn ${viewMode === 'agenda' ? 'active' : ''}`}
            onClick={() => setViewMode('agenda')}
          >
            <div className="dock-icon">📋</div>
            <span className="dock-label">Agenda</span>
          </button>
        </div>

        {/* ====================================================================
            MODAL: Selected Day Events Drawer / Modal
           ==================================================================== */}
        {selectedDayEvents && (
          <div className="modal-backdrop" onClick={() => setSelectedDayEvents(null)}>
            <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
              <div className="modal-header">
                <div>
                  <h3 style={{ margin: 0 }}>
                    Events on {selectedDayEvents.date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>{selectedDayEvents.events.length} Institutional activities scheduled</span>
                </div>
                <button className="close-btn" onClick={() => setSelectedDayEvents(null)}>&times;</button>
              </div>

              <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 20px' }}>
                {selectedDayEvents.events.map(ev => {
                  const cfg = EVENT_TYPE_CONFIG[ev.eventType] || EVENT_TYPE_CONFIG.training;
                  return (
                    <div
                      key={ev._id}
                      className="glass-card"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${cfg.border}`,
                        borderLeft: `4px solid ${cfg.color}`,
                        borderRadius: '12px',
                        padding: '14px 16px',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setSelectedDayEvents(null);
                        setSelectedEventModal(ev);
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: cfg.color, textTransform: 'uppercase' }}>
                          {cfg.icon} {cfg.label}
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          🕒 {new Date(ev.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <strong style={{ color: '#fff', fontSize: '14.5px', display: 'block' }}>{ev.title}</strong>
                      <p style={{ margin: '6px 0 0', color: '#cbd5e1', fontSize: '13px', lineHeight: '1.4' }}>{ev.description}</p>
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>📍 {ev.venueOrLink}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            MODAL: Single Event Detail Dossier Modal
           ==================================================================== */}
        {selectedEventModal && (
          <div className="modal-backdrop" onClick={() => setSelectedEventModal(null)}>
            <div className="modal-content glass-card animate-fade" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
              {(() => {
                const cfg = EVENT_TYPE_CONFIG[selectedEventModal.eventType] || EVENT_TYPE_CONFIG.training;
                return (
                  <>
                    <div className="modal-header" style={{ borderBottom: `2px solid ${cfg.color}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '26px' }}>{cfg.icon}</span>
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {cfg.label}
                          </span>
                          <h3 style={{ margin: 0, color: '#fff', fontSize: '1.25rem' }}>{selectedEventModal.title}</h3>
                        </div>
                      </div>
                      <button className="close-btn" onClick={() => setSelectedEventModal(null)}>&times;</button>
                    </div>

                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 24px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px' }}>
                        <div>
                          <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Start Date & Time</span>
                          <strong style={{ color: '#f1f5f9', fontSize: '13px' }}>
                            {new Date(selectedEventModal.startDateTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>End Date & Time</span>
                          <strong style={{ color: '#f1f5f9', fontSize: '13px' }}>
                            {new Date(selectedEventModal.endDateTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Host / Instructor</span>
                          <strong style={{ color: '#38bdf8', fontSize: '13px' }}>
                            {selectedEventModal.instructorOrCompany || 'GRIET Placement Cell'}
                          </strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Venue / Mode</span>
                          <strong style={{ color: '#34d399', fontSize: '13px' }}>
                            {selectedEventModal.venueOrLink || 'GRIET Campus'}
                          </strong>
                        </div>
                      </div>

                      <div>
                        <h4 style={{ color: '#fff', margin: '0 0 6px', fontSize: '14px' }}>Event Description</h4>
                        <p style={{ color: '#cbd5e1', fontSize: '13.5px', lineHeight: '1.5', margin: 0 }}>
                          {selectedEventModal.description || 'No detailed instructions provided.'}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Target Audience:</span>
                        {(selectedEventModal.targetAudience?.roles || ['student', 'faculty', 'admin']).map(r => (
                          <span key={r} style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', textTransform: 'capitalize' }}>
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 24px', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDownloadICS(selectedEventModal)}
                      >
                        📥 Add to Calendar (.ics)
                      </button>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        {(user?.role === 'admin' || user?.role === 'faculty') && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                            onClick={() => handleDeleteEvent(selectedEventModal._id)}
                          >
                            🗑️ Delete
                          </button>
                        )}
                        <button className="btn btn-secondary btn-sm" onClick={() => setSelectedEventModal(null)}>
                          Close
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* ====================================================================
            MODAL: Schedule New Event for Faculty/Admin
           ==================================================================== */}
        {showCreateModal && (
          <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
            <div className="modal-content glass-card animate-fade" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
              <div className="modal-header">
                <h3>➕ Schedule Placement & Academic Event</h3>
                <button className="close-btn" onClick={() => setShowCreateModal(false)}>&times;</button>
              </div>

              <form onSubmit={handleCreateEvent} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px 24px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Event Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Amazon Campus Recruitment Drive"
                    value={newEvent.title}
                    onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Event Type *</label>
                    <select
                      className="form-control"
                      value={newEvent.eventType}
                      onChange={e => setNewEvent({ ...newEvent, eventType: e.target.value })}
                    >
                      <option value="company_drive">🟣 Company Drive</option>
                      <option value="training">🟢 Training Session</option>
                      <option value="mock_interview">🔵 Mock Interview</option>
                      <option value="aptitude_test">🟠 Aptitude Test</option>
                      <option value="deadline">🔴 Strict Deadline</option>
                      <option value="workshop">🟡 Workshop</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Host / Company / Instructor</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Amazon India / Prof. Rao"
                      value={newEvent.instructorOrCompany}
                      onChange={e => setNewEvent({ ...newEvent, instructorOrCompany: e.target.value })}
                    />
                  </div>
                </div>

                {/* Start & End Times */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Start Date & Time *</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="date"
                        className="form-control"
                        value={newEvent.startDate}
                        onChange={e => setNewEvent({ ...newEvent, startDate: e.target.value })}
                        required
                      />
                      <input
                        type="time"
                        className="form-control"
                        value={newEvent.startTime}
                        onChange={e => setNewEvent({ ...newEvent, startTime: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>End Date & Time *</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="date"
                        className="form-control"
                        value={newEvent.endDate}
                        onChange={e => setNewEvent({ ...newEvent, endDate: e.target.value })}
                        required
                      />
                      <input
                        type="time"
                        className="form-control"
                        value={newEvent.endTime}
                        onChange={e => setNewEvent({ ...newEvent, endTime: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Venue / Meeting Link *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Central Auditorium / Google Meet link"
                    value={newEvent.venueOrLink}
                    onChange={e => setNewEvent({ ...newEvent, venueOrLink: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Event Description</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Provide instructions, eligibility notes, or preparation links for candidates..."
                    value={newEvent.description}
                    onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                  />
                </div>

                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={creating}>
                    {creating ? 'Scheduling...' : '🚀 Schedule Placement Event'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </>
  );
};

export default PlacementCalendar;
