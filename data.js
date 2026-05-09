const APP_DATA = {
  popularKeywords: ["안녕하세요", "감사합니다", "미안", "괜찮다"],

  categories: ["인사·예의", "감정·태도", "말·판단", "행동·시간"],

  recommendedSigns: [
    {
      id: 1,
      title: "괜찮다",
      description: "문제가 없거나 허용되는 상태",
      category: "감정·태도",
      videoUrl: "./videos/okay.webm"
    },
    {
      id: 2,
      title: "감사합니다",
      description: "고마움을 표현할 때 사용",
      category: "인사·예의",
      videoUrl: "./videos/thanks.webm"
    },
    {
      id: 3,
      title: "안녕하세요",
      description: "일상적인 인사 표현",
      category: "인사·예의",
      videoUrl: "./videos/hello.webm"
    },
    {
      id: 4,
      title: "못생기다",
      description: "외모가 아름답지 않음을 표현",
      category: "말·판단",
      videoUrl: "./videos/ugly.webm"
    },
    {
      id: 5,
      title: "미안",
      description: "사과할 때 사용하는 표현",
      category: "인사·예의",
      videoUrl: "./videos/sorry.webm"
    },
    {
      id: 8,
      title: "기다리다",
      description: "어떤 때를 기다리는 행동",
      category: "행동·시간",
      videoUrl: "./videos/wait.webm"
    },
    {
      id: 9,
      title: "좋다",
      description: "긍정적인 상태를 표현",
      category: "감정·태도",
      videoUrl: "./videos/good.webm"
    },
    {
      id: 10,
      title: "만나다",
      description: "사람을 서로 마주하는 상황",
      category: "행동·시간",
      videoUrl: "./videos/meet.webm"
    }
  ],

  quizData: [
    { id: 1, letter: "괜찮다", instruction: "'괜찮다' 수어를 표현하세요" },
    { id: 2, letter: "감사합니다", instruction: "'감사합니다' 수어를 표현하세요" },
    { id: 3, letter: "안녕하세요", instruction: "'안녕하세요' 수어를 표현하세요" },
    { id: 4, letter: "못생기다", instruction: "'못생기다' 수어를 표현하세요" },
    { id: 5, letter: "미안", instruction: "'미안' 수어를 표현하세요" },
    { id: 8, letter: "기다리다", instruction: "'기다리다' 수어를 표현하세요" },
    { id: 9, letter: "좋다", instruction: "'좋다' 수어를 표현하세요" },
    { id: 10, letter: "만나다", instruction: "'만나다' 수어를 표현하세요" }
  ]
};