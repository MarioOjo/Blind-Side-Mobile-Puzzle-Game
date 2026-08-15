// Defines the canonical puzzle images and relationship prompts written by the seed command.
const puzzleImages = [
  {
    imageId: 'people-maya',
    imageName: 'Maya',
    category: 'people',
    imageURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=85',
    difficultyRecommended: 'easy',
  },
  {
    imageId: 'places-santorini',
    imageName: 'Santorini Caldera',
    category: 'places',
    imageURL: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=85',
    difficultyRecommended: 'easy',
  },
  {
    imageId: 'characters-astronaut',
    imageName: 'The Astronaut',
    category: 'characters',
    imageURL: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1200&q=85',
    difficultyRecommended: 'easy',
  },
  {
    imageId: 'textures-brick-wall',
    imageName: 'Brick Wall',
    category: 'textures',
    imageURL: 'https://images.unsplash.com/photo-1495578942200-c5f5d2137def?auto=format&fit=crop&w=1200&q=85',
    difficultyRecommended: 'medium',
  },
  {
    imageId: 'textures-coffee-beans',
    imageName: 'Coffee Beans',
    category: 'textures',
    imageURL: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1200&q=85',
    difficultyRecommended: 'hard',
  },
];

const questions = [
  { questionId: 'acquaintance-01', tier: 'acquaintance', text: 'What do you do for work?' },
  { questionId: 'acquaintance-02', tier: 'acquaintance', text: "What's your go-to comfort food?" },
  { questionId: 'acquaintance-03', tier: 'acquaintance', text: 'How do you usually spend a free weekend?' },
  { questionId: 'acquaintance-04', tier: 'acquaintance', text: 'What place would you love to visit next?' },
  { questionId: 'acquaintance-05', tier: 'acquaintance', text: "What's something you're looking forward to this month?" },
  { questionId: 'friendship-01', tier: 'friendship', text: 'What always makes you laugh?' },
  { questionId: 'friendship-02', tier: 'friendship', text: "What's a memory you wish you could relive?" },
  { questionId: 'friendship-03', tier: 'friendship', text: 'When do you feel most like yourself?' },
  { questionId: 'friendship-04', tier: 'friendship', text: "What's something you're proud of that people rarely ask about?" },
  { questionId: 'friendship-05', tier: 'friendship', text: 'What kind of support means the most to you?' },
  { questionId: 'lover-01', tier: 'lover', text: 'What song reminds you of me?' },
  { questionId: 'lover-02', tier: 'lover', text: 'When did you first realize you could trust me?' },
  { questionId: 'lover-03', tier: 'lover', text: "What's one small thing I do that makes you feel loved?" },
  { questionId: 'lover-04', tier: 'lover', text: 'What adventure should we plan together?' },
  { questionId: 'lover-05', tier: 'lover', text: 'What do you hope never changes about us?' },
];

module.exports = { puzzleImages, questions };
