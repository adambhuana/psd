/**
 * Curriculum data extracted from learning_outcome.pdf
 * Structure designed for scalability - add new semesters/courses easily
 */
const CURRICULUM = [
    {
        id: 'sem1', name: 'Semester 1', sks: 20,
        desc: 'Fondasi Data Science & Kompetensi Dasar',
        courses: [
            { name: 'Foundations of Data Science', sks: 3, tools: 'Python, Jupyter Notebook, Google Colab, Pandas, NumPy' },
            { name: 'Design Thinking', sks: 2, tools: 'Figma, Miro, Draw.io, Notion' },
            { name: 'Discrete Mathematics', sks: 3, tools: 'Python, MATLAB, LaTeX' },
            { name: 'Human-Computer Interaction', sks: 3, tools: 'Figma, Adobe XD, Maze, InVision' },
            { name: 'Algorithms', sks: 3, tools: 'Python, C++, LeetCode, GitHub' },
            { name: 'Mathematical and Statistical Foundations', sks: 2, tools: 'Python, R, Excel, SPSS' },
            { name: 'Networks', sks: 2, tools: 'Wireshark, Cisco Packet Tracer, Nmap' },
            { name: 'Differential Calculus', sks: 2, tools: 'Python, MATLAB, Wolfram Alpha, GeoGebra' }
        ]
    },
    {
        id: 'sem2', name: 'Semester 2', sks: 20,
        desc: 'Pemrograman Lanjut, Database & Data Wrangling',
        portfolioFile: 'portfolio_semester_2.xlsx',
        courses: [
            { name: 'Object-Oriented Programming', sks: 3, tools: 'Python, Java, GitHub/GitLab, VS Code, UML Tools', hasPortfolio: true },
            { name: 'Database Systems', sks: 3, tools: 'MySQL, PostgreSQL, MongoDB, SQL, DBeaver', hasPortfolio: true },
            { name: 'Data Structures', sks: 3, tools: 'Python, Java, C++, GitHub', hasPortfolio: true },
            { name: 'Web Client Development', sks: 3, tools: 'HTML, CSS, JavaScript, React, Bootstrap, VS Code', hasPortfolio: true },
            { name: 'Statistical Thinking', sks: 3, tools: 'Python, R, SPSS, Pandas, Matplotlib', hasPortfolio: true },
            { name: 'Communication Protocols', sks: 3, tools: 'Wireshark, Postman, cURL, MQTT', hasPortfolio: true },
            { name: 'Data Wrangling', sks: 2, tools: 'Python, Pandas, NumPy, OpenRefine, Excel', hasPortfolio: true }
        ]
    },
    {
        id: 'ss1', name: 'Short Semester 1', sks: 9,
        desc: 'Independent Study / Remedial / Elective',
        courses: [
            { name: 'Independent Study Project', sks: 9, tools: 'Sesuai Topik, GitHub, Python' },
            { name: 'Remedial Course', sks: 9, tools: 'Sesuai MK' },
            { name: 'Elective Course', sks: 9, tools: 'Sesuai MK' }
        ]
    },
    {
        id: 'sem3', name: 'Semester 3', sks: 18,
        desc: 'Full-Stack Development, Visualisasi & Metode Numerik',
        courses: [
            { name: 'Web Application Development', sks: 3, tools: 'Node.js, React, Next.js, Laravel, Express.js, GitHub' },
            { name: 'Advanced Database Systems', sks: 3, tools: 'PostgreSQL, MongoDB, Redis, Cassandra, DBeaver' },
            { name: 'Stochastic Modeling', sks: 2, tools: 'Python, R, SciPy, SimPy' },
            { name: 'Numerical Methods', sks: 2, tools: 'Python, MATLAB, NumPy, SciPy' },
            { name: 'Advanced Computational Mathematics', sks: 2, tools: 'Python, MATLAB, Wolfram Alpha, LaTeX' },
            { name: 'Data Visualization', sks: 3, tools: 'Tableau, Power BI, D3.js, Matplotlib, Seaborn, Plotly' },
            { name: 'Optimization Methods', sks: 3, tools: 'Python, SciPy, PuLP, MATLAB, Gurobi' }
        ]
    },
    {
        id: 'sem4', name: 'Semester 4', sks: 18,
        desc: 'Text Mining, Big Data & Advanced Analytics',
        courses: [
            { name: 'Text Mining', sks: 3, tools: 'Python, NLTK, spaCy, Hugging Face, Scikit-learn' },
            { name: 'Data Warehousing and Mining', sks: 3, tools: 'SQL, Pentaho, Apache Spark, Power BI, Tableau' },
            { name: 'Technical / Professional Writing', sks: 2, tools: 'LaTeX, Notion, Confluence, Google Docs, Markdown' },
            { name: 'Mobile Computing', sks: 3, tools: 'Flutter, React Native, Android Studio, Firebase' },
            { name: 'Big Data Analytics', sks: 2, tools: 'Apache Spark, Hadoop, Kafka, Python, Databricks' },
            { name: 'Advanced Methods for Data Analytics', sks: 3, tools: 'Python, Scikit-learn, TensorFlow, XGBoost, MLflow' },
            { name: 'Data Privacy and Security', sks: 2, tools: 'Kali Linux, Wireshark, Python, OWASP ZAP, Nmap' }
        ]
    },
    {
        id: 'ss2', name: 'Short Semester 2', sks: 9,
        desc: 'Independent Study / Remedial / Elective',
        courses: [
            { name: 'Independent Study Project', sks: 9, tools: 'Sesuai Topik, GitHub, Python' },
            { name: 'Remedial Course', sks: 9, tools: 'Sesuai MK' },
            { name: 'Elective Course', sks: 9, tools: 'Sesuai MK' }
        ]
    },
    {
        id: 'sem5', name: 'Semester 5', sks: 18,
        desc: 'Concentration Tracks + Professional Ethics',
        courses: [
            { name: 'Professional Ethics', sks: 2, tools: 'Case Studies, Notion, IEEE/ACM Ethics Guidelines', note: 'Wajib semua konsentrasi' },
            { name: 'Deep Learning', sks: 3, tools: 'TensorFlow, PyTorch, Keras, CUDA, Google Colab', note: 'Konsentrasi AI/ML' },
            { name: 'Natural Language Processing (NLP)', sks: 3, tools: 'Hugging Face, spaCy, NLTK, Transformers, GPT API', note: 'Konsentrasi AI/ML' },
            { name: 'Computer Vision', sks: 3, tools: 'OpenCV, YOLO, TensorFlow, PyTorch, Pillow', note: 'Konsentrasi AI/ML' },
            { name: 'Big Data Infrastructure', sks: 2, tools: 'Hadoop, Apache Spark, HDFS, YARN, Mesos', note: 'Konsentrasi Data Engineering' },
            { name: 'Distributed Systems', sks: 3, tools: 'Apache Kafka, ZooKeeper, gRPC, Docker, Kubernetes', note: 'Konsentrasi Data Engineering' },
            { name: 'Business Intelligence Tools', sks: 2, tools: 'Tableau, Power BI, Looker, Metabase, QlikView', note: 'Konsentrasi BI' },
            { name: 'Predictive Analytics', sks: 3, tools: 'Python, Scikit-learn, XGBoost, AutoML, H2O.ai', note: 'Konsentrasi BI' }
        ]
    },
    {
        id: 'sem6', name: 'Semester 6 (MBKM I)', sks: 24,
        desc: 'Data Science Project Management, ETL, Statistical Modeling & MK Umum',
        courses: [
            { name: 'Data Science Project Management', sks: 4, tools: 'Jira, Notion, Trello, MS Project, GitHub Projects' },
            { name: 'Advanced Data Processing and ETL', sks: 4, tools: 'Apache Airflow, Talend, Python, SQL, dbt, Spark' },
            { name: 'Data Wrangling and Preprocessing Techniques', sks: 4, tools: 'Python, Pandas, NumPy, OpenRefine, Great Expectations' },
            { name: 'Statistical Modeling and Inference', sks: 4, tools: 'Python, R, Stata, SAS, PyMC3, Statsmodels' },
            { name: 'Business Communication and Data Presentation', sks: 4, tools: 'Power BI, Tableau, Google Slides, Canva, Prezi' },
            { name: 'Indonesian Way of Life / Pancasila', sks: 2, tools: 'Presentation Tools, Discussion Forums' },
            { name: 'Religions of the World', sks: 2, tools: 'Presentation Tools, Research Databases' }
        ]
    },
    {
        id: 'sem7', name: 'Semester 7 (MBKM II)', sks: 24,
        desc: 'ML Applications, Big Data, Predictive Analytics & Capstone',
        courses: [
            { name: 'Machine Learning Applications', sks: 4, tools: 'Python, Scikit-learn, TensorFlow, PyTorch, MLflow, Docker' },
            { name: 'Big Data Technologies and Cloud Integration', sks: 4, tools: 'Apache Spark, Kafka, AWS, GCP, Azure, Databricks' },
            { name: 'Predictive Analytics and Forecasting', sks: 4, tools: 'Python, Prophet, ARIMA, XGBoost, Statsmodels' },
            { name: 'Data Ethics and Privacy', sks: 4, tools: 'OWASP ZAP, Python, Kali Linux, GDPR Tools' },
            { name: 'Capstone Data Science Project', sks: 4, tools: 'Full Stack, Python, Docker, GitHub, Cloud Platform' },
            { name: 'Applied Indonesian Language', sks: 2, tools: 'MS Word, LaTeX, Turnitin' },
            { name: 'Civic / Kewarganegaraan', sks: 2, tools: 'Presentation Tools, Research Databases' }
        ]
    },
    {
        id: 'sem8', name: 'Semester 8', sks: 10,
        desc: 'Capstone Project, Thesis, Portfolio & Publikasi',
        courses: [
            { name: 'Capstone Project', sks: 6, tools: 'Full Stack, Python, Docker, GitHub, Cloud Platform, CI/CD' },
            { name: 'Collaborative Project', sks: 0, tools: 'GitHub, Jira, Notion, Slack, MS Teams', note: 'Komponen Capstone' },
            { name: 'Portfolio', sks: 0, tools: 'GitHub Pages, Behance, LinkedIn, Personal Website', note: 'Komponen Capstone' },
            { name: 'Product Prototype', sks: 0, tools: 'Figma, Docker, GitHub, Cloud Platform, Postman', note: 'Komponen Capstone' },
            { name: 'Scientific Publication', sks: 0, tools: 'LaTeX, Mendeley, Zotero, Google Scholar, Turnitin', note: 'Komponen Capstone' },
            { name: 'Thesis', sks: 0, tools: 'LaTeX, Mendeley, SPSS, Python, Turnitin', note: 'Komponen Capstone' },
            { name: 'Academic Writing in English', sks: 2, tools: 'LaTeX, Grammarly, Mendeley, Zotero, MS Word' },
            { name: 'Research Methodology', sks: 2, tools: 'SPSS, Python, R, LaTeX, Mendeley, Google Scholar' }
        ]
    }
];

/**
 * Map portfolio Excel files to semesters.
 * Add new entries here when new portfolio files are available.
 * Key = semester id, Value = { file, sheets (auto-detected from Excel) }
 */
const PORTFOLIO_FILES = {
    'sem2': 'portfolio_semester_2.xlsx'
    // 'sem3': 'portfolio_semester_3.xlsx',  // future expansion
};
