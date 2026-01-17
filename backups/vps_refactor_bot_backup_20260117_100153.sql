--
-- PostgreSQL database dump
--

\restrict Jmwy40soeakhR6wZZLwyq2lGD0xxD1kXt0xDhhaN9u11ak6mEhk8iRT01Xxjcyw

-- Dumped from database version 17.7
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: conversation_messages; Type: TABLE; Schema: public; Owner: refactor
--

CREATE TABLE public.conversation_messages (
    id text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "messageId" text NOT NULL,
    "threadId" text NOT NULL,
    "channelId" text NOT NULL,
    "userId" text NOT NULL,
    "userName" text NOT NULL,
    content text NOT NULL,
    "isBot" boolean DEFAULT false NOT NULL,
    "aiResponse" text,
    "responseTime" integer,
    "messageNumber" integer NOT NULL,
    "topicsDiscussed" text[],
    "recommendationId" text
);


ALTER TABLE public.conversation_messages OWNER TO refactor;

--
-- Name: guild_configs; Type: TABLE; Schema: public; Owner: refactor
--

CREATE TABLE public.guild_configs (
    id text NOT NULL,
    "guildId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "recommendationsChannelId" text,
    "fictionVaultForumId" text,
    "athenaeumForumId" text,
    "growthLabForumId" text,
    "searchChannelId" text,
    "autoProcessingEnabled" boolean DEFAULT true NOT NULL,
    "aiAnalysisEnabled" boolean DEFAULT true NOT NULL
);


ALTER TABLE public.guild_configs OWNER TO refactor;

--
-- Name: processing_logs; Type: TABLE; Schema: public; Owner: refactor
--

CREATE TABLE public.processing_logs (
    id text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "recommendationId" text,
    operation text NOT NULL,
    status text NOT NULL,
    message text,
    metadata jsonb
);


ALTER TABLE public.processing_logs OWNER TO refactor;

--
-- Name: recommendations; Type: TABLE; Schema: public; Owner: refactor
--

CREATE TABLE public.recommendations (
    id text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "originalMessageId" text NOT NULL,
    "originalChannelId" text NOT NULL,
    "originalContent" text NOT NULL,
    "recommenderId" text NOT NULL,
    "recommenderName" text NOT NULL,
    url text NOT NULL,
    title text,
    description text,
    "contentType" text,
    topics text[],
    duration text,
    "qualityScore" double precision,
    sentiment text,
    "aiSummary" text,
    thumbnail text,
    "libraryType" text,
    "primaryTag" text,
    "secondaryTags" text[] DEFAULT ARRAY[]::text[],
    "forumPostId" text,
    "forumThreadId" text,
    processed boolean DEFAULT false NOT NULL,
    "processingError" text,
    "processingAttempts" integer DEFAULT 0 NOT NULL,
    "processedAt" timestamp(3) without time zone,
    "conversationCount" integer DEFAULT 0 NOT NULL,
    "lastConversationAt" timestamp(3) without time zone,
    "engagementScore" double precision
);


ALTER TABLE public.recommendations OWNER TO refactor;

--
-- Name: thread_engagement; Type: TABLE; Schema: public; Owner: refactor
--

CREATE TABLE public.thread_engagement (
    id text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "threadId" text NOT NULL,
    "recommendationId" text NOT NULL,
    "totalMessages" integer DEFAULT 0 NOT NULL,
    "userMessages" integer DEFAULT 0 NOT NULL,
    "botMessages" integer DEFAULT 0 NOT NULL,
    "uniqueUsers" integer DEFAULT 0 NOT NULL,
    "topicsDiscussed" text[],
    "avgResponseTime" double precision,
    "participantIds" text[],
    "participantNames" text[],
    "firstMessageAt" timestamp(3) without time zone,
    "lastMessageAt" timestamp(3) without time zone,
    "engagementScore" double precision
);


ALTER TABLE public.thread_engagement OWNER TO refactor;

--
-- Data for Name: conversation_messages; Type: TABLE DATA; Schema: public; Owner: refactor
--

COPY public.conversation_messages (id, "createdAt", "updatedAt", "messageId", "threadId", "channelId", "userId", "userName", content, "isBot", "aiResponse", "responseTime", "messageNumber", "topicsDiscussed", "recommendationId") FROM stdin;
\.


--
-- Data for Name: guild_configs; Type: TABLE DATA; Schema: public; Owner: refactor
--

COPY public.guild_configs (id, "guildId", "createdAt", "updatedAt", "recommendationsChannelId", "fictionVaultForumId", "athenaeumForumId", "growthLabForumId", "searchChannelId", "autoProcessingEnabled", "aiAnalysisEnabled") FROM stdin;
\.


--
-- Data for Name: processing_logs; Type: TABLE DATA; Schema: public; Owner: refactor
--

COPY public.processing_logs (id, "createdAt", "recommendationId", operation, status, message, metadata) FROM stdin;
\.


--
-- Data for Name: recommendations; Type: TABLE DATA; Schema: public; Owner: refactor
--

COPY public.recommendations (id, "createdAt", "updatedAt", "originalMessageId", "originalChannelId", "originalContent", "recommenderId", "recommenderName", url, title, description, "contentType", topics, duration, "qualityScore", sentiment, "aiSummary", thumbnail, "libraryType", "primaryTag", "secondaryTags", "forumPostId", "forumThreadId", processed, "processingError", "processingAttempts", "processedAt", "conversationCount", "lastConversationAt", "engagementScore") FROM stdin;
cmkfr11qh0000nf0629fblp8k	2026-01-15 17:54:08.009	2026-01-15 17:54:17.339	1447941979832057906	1447661933183504635	https://youtube.com/watch?v=07I94TnlMIA&si=YW7Dsf7P2f1Z-BlS	175412165061115907	spriggan666	https://youtube.com/watch?v=07I94TnlMIA&si=YW7Dsf7P2f1Z-BlS	YouTube Video 07I94TnlMIA	A YouTube video shared by spriggan666 with no available description or metadata to determine its content or purpose.	video	{}	\N	1	neutral	This is a YouTube video link shared without context or description. Without access to the actual video content, title, or description, it's impossible to determine what the video is about or its value.	\N	athenaeum	Fringe/Mystery	{Intro/Pop}	1461418226796990635	1461418226796990635	t	\N	0	2026-01-15 17:54:17.333	0	\N	\N
cmkgxks240000nf06zwfll8pc	2026-01-16 13:45:12.46	2026-01-16 13:45:21.025	1461717930197913742	1447661933183504635	https://youtu.be/EKOU3JWDNLI?si=eTPe6Ye_o7TnMvoh	201442951459504128	faiyted	https://youtu.be/EKOU3JWDNLI?si=eTPe6Ye_o7TnMvoh	YouTube Video EKOU3JWDNLI	A YouTube video shared without additional context or description from the recommender.	video	{}	\N	3	neutral	This is a YouTube video link shared by faiyted without any accompanying description or context. The actual content, channel, and topic remain unknown based on the available information.	\N	athenaeum	Video/Course	{}	1461717966809727204	1461717966809727204	t	\N	0	2026-01-16 13:45:21.024	0	\N	\N
cmkfr18xu0001nf060hw0dyfe	2026-01-15 17:54:17.346	2026-01-15 17:54:32.704	1448461811283132498	1447661933183504635	https://pca.st/episode/29601e1a-6515-4bf5-97cc-2c55d6cfad02	201442951459504128	faiyted	https://pca.st/episode/29601e1a-6515-4bf5-97cc-2c55d6cfad02	How to Improve Your Vitality & Heal From Disease | Dr. Mark Hyman	A podcast episode featuring Dr. Mark Hyman discussing strategies for enhancing vitality and healing from various diseases through lifestyle and health interventions.	podcast	{Health,Nutrition,Self-Improvement,"Mental Health"}	60 min	7	informative	Dr. Mark Hyman shares evidence-based approaches to improving overall vitality and supporting the body's natural healing processes. The discussion likely covers nutrition, lifestyle factors, and functional medicine principles for optimal health outcomes.	https://static.pocketcasts.com/discover/images/webp/480/395bad80-26fe-0139-32ce-0acc26574db2.webp	growth	Health & Fitness	{"Mental Health",Food/Cooking,"Gold Standard"}	1461418291607371796	1461418291607371796	t	\N	0	2026-01-15 17:54:32.703	0	\N	\N
cmkfr1kso0002nf06m3q2gdru	2026-01-15 17:54:32.712	2026-01-15 17:54:40.418	1448463486618304512	1447661933183504635	https://youtu.be/XDOSZ9W4peQ?si=j5QkxMGNlSqSS69b	201442951459504128	faiyted	https://youtu.be/XDOSZ9W4peQ?si=j5QkxMGNlSqSS69b	YouTube Video XDOSZ9W4peQ	A YouTube video shared by faiyted with no available description or channel information.	video	{}	\N	1	neutral	This is a YouTube video recommendation with no accessible content details. Without video description, channel information, or title, it's impossible to determine the subject matter or value of this content.	\N	athenaeum	Fringe/Mystery	{}	1461418324079546532	1461418324079546532	t	\N	0	2026-01-15 17:54:40.417	0	\N	\N
cmkfr1qr60003nf064yfgjuhg	2026-01-15 17:54:40.435	2026-01-15 17:54:46.793	1448464360161673237	1447661933183504635	https://www.youtube.com/watch?v=t1MqJPHxy6g	201442951459504128	faiyted	https://www.youtube.com/watch?v=t1MqJPHxy6g	YouTube Video t1MqJPHxy6g	A YouTube video shared by faiyted with no available description or channel information.	video	{}	\N	1	neutral	Unable to analyze content due to lack of video details, description, or channel information. The video appears to be inaccessible or the metadata is unavailable.	\N	growth	Video/Course	{}	1461418349648154718	1461418349648154718	t	\N	0	2026-01-15 17:54:46.791	0	\N	\N
cmkfr1vnz0004nf06b9q905no	2026-01-15 17:54:46.799	2026-01-15 17:54:53.787	1448464466709708863	1447661933183504635	https://youtube.com/watch?v=yXJH3FywOgQ&si=Ge_0c7gxL1QYa76F	175412165061115907	spriggan666	https://youtube.com/watch?v=yXJH3FywOgQ&si=Ge_0c7gxL1QYa76F	YouTube Video yXJH3FywOgQ	A YouTube video shared by spriggan666 with no available description or channel information.	video	{}	\N	1	neutral	This is a YouTube video link shared in Discord with no accessible metadata. Without video content, description, or channel information, the actual subject matter and value cannot be determined.	\N	athenaeum	Essay/Paper	{Intro/Pop}	1461418379637293302	1461418379637293302	t	\N	0	2026-01-15 17:54:53.786	0	\N	\N
cmkfr2yf10009nf068ueo71lr	2026-01-15 17:55:37.021	2026-01-15 17:55:47.11	1448744602654871693	1447661933183504635	https://share.libbyapp.com/title/36902	734442122450829343	quirx_	https://share.libbyapp.com/title/36902	Snow Crash	A groundbreaking cyberpunk novel by Neal Stephenson that predicted the metaverse and follows hacker Hiro and courier Y.T. as they investigate a dangerous digital drug threatening both virtual and real worlds.	book	{Tech,AI,Science}	12-15 hours	9	positive	Snow Crash is a visionary cyberpunk novel that explores a dystopian future where the physical and digital worlds collide. The story follows pizza delivery driver and legendary hacker Hiro as he investigates a mysterious drug that affects both avatars in the Metaverse and their real-world users, leading to discoveries about the origins of language and consciousness.	https://img1.od-cdn.com/ImageType-100/0111-1/{2D7A68AF-30B6-4B42-9FFA-3C51101BF423}IMG100.JPG	fiction	Sci-Fi	{Novel/Book,Classics,Masterpiece}	1461418603805937684	1461418603805937684	t	\N	0	2026-01-15 17:55:47.109	0	\N	\N
cmkfr212a0005nf0661lccu6s	2026-01-15 17:54:53.794	2026-01-15 17:55:03.994	1448471544681599087	1447661933183504635	https://www.audible.com/pd/0593348702?source_code=ASSOR150021921000O	201442951459504128	faiyted	https://www.audible.com/pd/0593348702?source_code=ASSOR150021921000O	The Comfort Crisis	An audiobook exploring the evolutionary benefits of pushing beyond your comfort zone and reconnecting with challenging, wild experiences for mental and physical well-being.	book	{"Mental Health",Self-Improvement,Health,Psychology}	8-10 hours	8	positive	Michael Easter examines how modern comfort has weakened us physically and mentally, arguing that deliberately seeking discomfort and wild experiences can restore our evolutionary advantages. The book combines scientific research with practical insights on how stepping outside our comfort zones can improve our minds and bodies.	https://m.media-amazon.com/images/I/41amJ6xxHJS._SL10_UR1600,800_CR200,50,1200,630_CLa%7C1200,630%7C41amJ6xxHJS.jpg%7C0,0,1200,630+82,82,465,465_PJAdblSocialShare-Gradientoverlay-largeasin-0to70,TopLeft,0,0_PJAdblSocialShare-AudibleLogo-Large,TopLeft,600,270_OU01_ZBLISTENING%20ON,617,216,52,500,AudibleSansMd,30,255,255,255.jpg	growth	Mental Health	{"Health & Fitness",Self-Improvement,Book}	1461418422188638429	1461418422188638429	t	\N	0	2026-01-15 17:55:03.993	0	\N	\N
cmkfr28xu0006nf06rsky8n5t	2026-01-15 17:55:04.002	2026-01-15 17:55:16.865	1448515788708249621	1447661933183504635	https://goodmenproject.com/featured-content/now-is-when-the-real-work-begins/	201442951459504128	faiyted	https://goodmenproject.com/featured-content/now-is-when-the-real-work-begins/	Now Is When the Real Work Begins	A motivational article arguing that people must choose between making excuses (reasons) or taking action (results) to create meaningful change in their lives.	article	{Self-Improvement,"Mental Health",Psychology,Productivity}	8 min read	6	positive	This article presents a binary choice between living by excuses (reasons) or taking decisive action (results) to transform your life. The author argues that most people remain trapped by self-imposed limitations and comfortable excuses, preventing real growth and change.	https://goodmenproject.com/wp-content/uploads/2024/11/daniele-la-rosa-messina-ebZKPO7stu4-unsplash-1.jpg	growth	Mental Health	{Productivity,Leadership,"Quick Tip"}	1461418476487839937	1461418476487839937	t	\N	0	2026-01-15 17:55:16.864	0	\N	\N
cmkfr2ivc0007nf06pwl3jpiu	2026-01-15 17:55:16.872	2026-01-15 17:55:27.266	1448735260685893642	1447661933183504635	https://open.spotify.com/episode/4zXN80VsLVwbXjQSsHBGft?si=QsoqOpjzQpKUPcgnCdP1TA&t=0&pi=vy45SuHIT5KQ3	201442951459504128	faiyted	https://open.spotify.com/episode/4zXN80VsLVwbXjQSsHBGft?si=QsoqOpjzQpKUPcgnCdP1TA&t=0&pi=vy45SuHIT5KQ3	Essentials: The Science of Making & Breaking Habits	A podcast episode exploring the scientific mechanisms behind habit formation and strategies for creating positive habits while breaking negative ones.	podcast	{Psychology,Self-Improvement,"Mental Health",Productivity}	\N	8	informative	This podcast delves into the neuroscience and psychology of habit formation, explaining how habits are created in the brain and providing evidence-based strategies for building beneficial habits and eliminating harmful ones. It combines scientific research with practical applications for personal development.	https://image-cdn-ak.spotifycdn.com/image/ab6772ab000015beb9c20968653447ad63abd4b6	growth	Mental Health	{Podcast,Beginner,"Gold Standard"}	1461418520243081395	1461418520243081395	t	\N	0	2026-01-15 17:55:27.264	0	\N	\N
cmkfr2qw90008nf06hdlwnewx	2026-01-15 17:55:27.274	2026-01-15 17:55:37.013	1448741223262060604	1447661933183504635	https://a.co/4EIOr2B	734442122450829343	quirx_	https://a.co/4EIOr2B	The Name of the Wind (The Kingkiller Chronicle Book 1)	The first book in Patrick Rothfuss' epic fantasy series, a #1 New York Times bestseller that introduces readers to the Kingkiller Chronicle universe.	book	{Self-Improvement,Psychology}	20-25 hours	9	positive	The Name of the Wind is the acclaimed opening novel of The Kingkiller Chronicle series by Patrick Rothfuss. This epic fantasy has garnered widespread praise, including endorsement from Lin-Manuel Miranda, and has achieved bestseller status for its rich world-building and storytelling.	https://m.media-amazon.com/images/I/51FTWmg+WQL._SL500_.jpg	fiction	Novel/Book	{Fantasy,Masterpiece,"Slow Burn"}	1461418561267437768	1461418561267437768	t	\N	0	2026-01-15 17:55:37.011	0	\N	\N
cmkfr367j000anf06td8hxmwu	2026-01-15 17:55:47.12	2026-01-15 17:55:56.68	1448744878518440086	1447661933183504635	https://a.co/7prRgQM	734442122450829343	quirx_	https://a.co/7prRgQM	The Sirens of Titan: A Novel	Kurt Vonnegut's acclaimed science fiction novel exploring the ultimate questions about the meaning of life through a darkly humorous and philosophical narrative.	book	{Psychology,Science}	8-10 hours	9	positive	This is Kurt Vonnegut's highly praised science fiction novel that tackles existential questions about life's meaning through his signature blend of dark humor and philosophical insight. The book is considered by many critics to be Vonnegut's best work and has been nominated as one of America's best-loved novels.	https://m.media-amazon.com/images/I/41PMnDPDWlL._SL500_.jpg	fiction	Sci-Fi	{Classics,Masterpiece,Comedy/Satire}	1461418643882512477	1461418643882512477	t	\N	0	2026-01-15 17:55:56.678	0	\N	\N
cmkfr3dl9000bnf06f5xo0wsf	2026-01-15 17:55:56.685	2026-01-15 17:56:04.424	1449035476517519442	1447661933183504635	https://www.youtube.com/watch?v=HdUbTyvrfKo	1082084658042392587	thecoderanger	https://www.youtube.com/watch?v=HdUbTyvrfKo	YouTube Video HdUbTyvrfKo	A YouTube video shared by thecoderanger with unknown content. Video details, channel information, and description are not available.	video	{Tech}	\N	3	neutral	This is a YouTube video link shared by a user named thecoderanger, but the video content, title, description, and channel information are not accessible. Without being able to view the actual content, it's impossible to determine the video's subject matter or quality.	\N	growth	Video/Course	{Tool/Resource}	1461418675763675258	1461418675763675258	t	\N	0	2026-01-15 17:56:04.422	0	\N	\N
cmkfr3jke000cnf06vt1gimvr	2026-01-15 17:56:04.431	2026-01-15 17:56:12.027	1449104897893994527	1447661933183504635	https://www.youtube.com/watch?v=SGufm4MZtDQ	201442951459504128	faiyted	https://www.youtube.com/watch?v=SGufm4MZtDQ	YouTube Video SGufm4MZtDQ	A YouTube video shared without additional context or description from the recommender.	video	{Tech}	\N	3	neutral	This is a YouTube video link shared by the user faiyted without any accompanying description or context. Without access to the actual video content, it's impossible to determine the specific subject matter or value proposition.	\N	growth	Tool/Resource	{"Quick Tip"}	1461418707925471346	1461418707925471346	t	\N	0	2026-01-15 17:56:12.026	0	\N	\N
cmkfr3pfm000dnf063ldbivjv	2026-01-15 17:56:12.034	2026-01-15 17:56:19.426	1449569959733624913	1447661933183504635	https://www.youtube.com/watch?v=VHpjVl0HzDc	1082084658042392587	thecoderanger	https://www.youtube.com/watch?v=VHpjVl0HzDc	YouTube Video VHpjVl0HzDc	A YouTube video shared by thecoderanger with no available description or metadata.	video	{Tech}	\N	3	neutral	This is a YouTube video link shared without context or description. The content and quality cannot be determined from the available information.	\N	growth	Video/Course	{Tool/Resource}	1461418738090774754	1461418738090774754	t	\N	0	2026-01-15 17:56:19.425	0	\N	\N
cmkfr3v54000enf06wazpisca	2026-01-15 17:56:19.432	2026-01-15 17:56:26.895	1449788171930828810	1447661933183504635	https://youtu.be/Q-xCMZL0Pts?si=qp4naPnLLpe4D0MP	201442951459504128	faiyted	https://youtu.be/Q-xCMZL0Pts?si=qp4naPnLLpe4D0MP	YouTube Video Q-xCMZL0Pts	A YouTube video shared without context or description, making it impossible to determine the specific content or subject matter.	video	{Tech}	\N	3	neutral	This is a YouTube video link shared by faiyted without any accompanying description or context. The video details are undefined, making it impossible to assess the actual content, quality, or relevance.	\N	growth	Video/Course	{Beginner}	1461418769783066679	1461418769783066679	t	\N	0	2026-01-15 17:56:26.894	0	\N	\N
cmkfr40wm000fnf061l2a6kp5	2026-01-15 17:56:26.903	2026-01-15 17:56:38.206	1449788446385115267	1447661933183504635	https://youtu.be/IH_8eRTAXHo?si=1XWWzP7gIR3BSN1u meant to share part one.	201442951459504128	faiyted	https://youtu.be/IH_8eRTAXHo?si=1XWWzP7gIR3BSN1u	John McAfee: The Craziest Man In Tech (Part 1/4)	A documentary exploring the wild and controversial life of antivirus software pioneer John McAfee, covering his rise in tech and descent into madness. Part one of a four-part series examining one of the most eccentric figures in technology history.	video	{Tech,Psychology,Career}	45 min	7	informative	This documentary chronicles the extraordinary and chaotic life of John McAfee, from his groundbreaking work creating McAfee antivirus software to his increasingly erratic behavior and legal troubles. The series examines how a brilliant tech entrepreneur became one of the most notorious fugitives in modern history.	https://i.ytimg.com/vi/IH_8eRTAXHo/maxresdefault.jpg	athenaeum	Biography	{"True Crime",Psychology,"Hot Topic"}	1461418817543471309	1461418817543471309	t	\N	0	2026-01-15 17:56:38.204	0	\N	\N
cmkfr49ms000gnf06a0pebo5p	2026-01-15 17:56:38.212	2026-01-15 17:56:46.126	1449811738684952607	1447661933183504635	https://www.youtube.com/watch?v=V1_7BO07EtQ	1082084658042392587	thecoderanger	https://www.youtube.com/watch?v=V1_7BO07EtQ	YouTube Video V1_7BO07EtQ	A YouTube video with no available metadata or description to determine its content or purpose.	video	{}	\N	1	neutral	This is a YouTube video link with no accessible content details, title, or description. Without metadata or channel information, it's impossible to determine the video's subject matter, quality, or educational value.	\N	athenaeum	Fringe/Mystery	{}	1461418850716487784	1461418850716487784	t	\N	0	2026-01-15 17:56:46.124	0	\N	\N
cmkfr4fqw000hnf06lupaaq3m	2026-01-15 17:56:46.136	2026-01-15 17:56:54.935	1450500294495440978	1447661933183504635	https://youtu.be/0jqjmEgzy2s?si=NZ9KpKlDUTFG5Jhe&t=688	1082084658042392587	thecoderanger	https://youtu.be/0jqjmEgzy2s?si=NZ9KpKlDUTFG5Jhe&t=688	YouTube Video 0jqjmEgzy2s	A YouTube video shared by thecoderanger with a specific timestamp at 11:28. Content details are not available from the provided information.	video	{Tech}	\N	5	neutral	This is a YouTube video recommendation shared with a specific timestamp, suggesting the recommender wanted to highlight a particular moment or segment. Without access to the actual video content, the specific value and subject matter cannot be determined.	\N	growth	Video/Course	{"Quick Tip"}	1461418886061756670	1461418886061756670	t	\N	0	2026-01-15 17:56:54.934	0	\N	\N
cmkfr4mji000inf06lkauco5g	2026-01-15 17:56:54.942	2026-01-15 17:57:01.96	1450876558607782100	1447661933183504635	https://youtu.be/rtySu1FtFag?si=C0bljAf3-4GZhLC-	201442951459504128	faiyted	https://youtu.be/rtySu1FtFag?si=C0bljAf3-4GZhLC-	YouTube Video rtySu1FtFag	A YouTube video with limited metadata available for analysis.	video	{Tech}	\N	3	neutral	This is a YouTube video shared by faiyted without additional context or description. The content and purpose of the video cannot be determined from the available information.	\N	growth	Video/Course	{Tool/Resource}	1461418916755800118	1461418916755800118	t	\N	0	2026-01-15 17:57:01.959	0	\N	\N
cmkfr4ryl000jnf063agkkoy3	2026-01-15 17:57:01.965	2026-01-15 17:57:08.596	1451212052726153247	1447661933183504635	https://youtu.be/i3-wTqnzJvI?si=1ctTWrwEEXBOXHw5	1082084658042392587	thecoderanger	https://youtu.be/i3-wTqnzJvI?si=1ctTWrwEEXBOXHw5	YouTube Video i3-wTqnzJvI	A YouTube video shared by thecoderanger, though specific content details are not available from the provided information.	video	{Tech}	\N	5	neutral	This is a YouTube video recommendation from thecoderanger. Without access to the actual video content, title, or description, it's difficult to determine the specific subject matter or value proposition.	\N	growth	Video/Course	{Tool/Resource}	1461418945113227429	1461418945113227429	t	\N	0	2026-01-15 17:57:08.595	0	\N	\N
cmkfr4x2x000knf06pgm3lp47	2026-01-15 17:57:08.602	2026-01-15 17:57:19.653	1453725066591338616	1447661933183504635	https://solvedpodcast.com/procrastination/	734442122450829343	quirx_	https://solvedpodcast.com/procrastination/	Procrastination, Solved - Solved Podcast	A membership program promoting courses and community support for overcoming procrastination and creating lasting behavioral change through actionable strategies.	other	{Productivity,Self-Improvement,"Mental Health"}	\N	5	positive	This appears to be a promotional page for the Solved Membership, which offers bite-sized courses, community support, and exclusive content aimed at helping people overcome procrastination. The program focuses on applying podcast learnings to real life for faster, lasting change through small wins.	https://solvedpodcast.com/wp-content/uploads/2025/04/SolvedOpenGraphV2.png	growth	Productivity	{"Mental Health",Tool/Resource,Beginner}	1461418991359889442	1461418991359889442	t	\N	0	2026-01-15 17:57:19.652	0	\N	\N
cmkfr55m5000lnf06kf03xyye	2026-01-15 17:57:19.661	2026-01-15 17:57:27.927	1454487435357454387	1447661933183504635	https://youtu.be/fP5URbP30j0?si=O-uPKrj9auqd_hV3	201442951459504128	faiyted	https://youtu.be/fP5URbP30j0?si=O-uPKrj9auqd_hV3	YouTube Video fP5URbP30j0	A YouTube video shared by faiyted with no additional context or description provided.	video	{Tech}	\N	3	neutral	This is a YouTube video recommendation shared without any context, description, or commentary from the recommender. Without access to the actual video content, title, or channel information, it's impossible to determine the specific subject matter or value proposition.	\N	growth	Tool/Resource	{Beginner,"Quick Tip"}	1461419025916498090	1461419025916498090	t	\N	0	2026-01-15 17:57:27.925	0	\N	\N
cmkfr5bzx000mnf06ri47k544	2026-01-15 17:57:27.933	2026-01-15 17:57:38.31	1455659489704280188	1447661933183504635	https://www.audible.com/pd/0593415256?source_code=ORGOR69210072400FU	734442122450829343	quirx_	https://www.audible.com/pd/0593415256?source_code=ORGOR69210072400FU	Turn the Ship Around!	A leadership audiobook by L. David Marquet about empowering leadership principles and effective delegation strategies, based on his experience transforming a nuclear submarine crew.	book	{Career,Self-Improvement,Productivity}	8-10 hours	8	positive	This acclaimed business audiobook presents timeless principles of empowering leadership through real-world naval experience. It serves as a comprehensive manual for managers on delegation, training, and driving flawless execution in any organization.	https://m.media-amazon.com/images/I/51kmnt22LcL._SL10_UR1600,800_CR200,50,1200,630_CLa%7C1200,630%7C51kmnt22LcL.jpg%7C0,0,1200,630+82,82,465,465_PJAdblSocialShare-Gradientoverlay-largeasin-0to70,TopLeft,0,0_PJAdblSocialShare-AudibleLogo-Large,TopLeft,600,270_OU01_ZBLISTENING%20ON,617,216,52,500,AudibleSansMd,30,255,255,255.jpg	growth	Leadership	{Business/Econ,"Gold Standard",Book}	1461419069738848452	1461419069738848452	t	\N	0	2026-01-15 17:57:38.309	0	\N	\N
cmkfr5k0c000nnf06ds8it4xt	2026-01-15 17:57:38.316	2026-01-15 17:57:48.149	1457659251681001645	1447661933183504635	https://pca.st/episode/535c5672-2b87-4996-b030-43fcd8142dc9	734442122450829343	quirx_	https://pca.st/episode/535c5672-2b87-4996-b030-43fcd8142dc9	Rich Dad Poor Dad	A financial education podcast episode discussing Robert Kiyosaki's principles about money, investing, and building wealth through the contrasting lessons from two father figures.	podcast	{Career,Self-Improvement}	\N	7	informative	This podcast explores the key concepts from Robert Kiyosaki's influential book 'Rich Dad Poor Dad', focusing on financial literacy and wealth-building strategies. The content likely covers the fundamental differences between how the wealthy and poor think about money, assets, and financial independence.	https://static.pocketcasts.com/discover/images/webp/480/c1f1e8b0-3c87-013b-efca-0acc26574db2.webp	growth	Finance	{Business/Econ,Book}	1461419110683508904	1461419110683508904	t	\N	0	2026-01-15 17:57:48.148	0	\N	\N
cmkfr5rln000onf06mehfb5af	2026-01-15 17:57:48.156	2026-01-15 17:58:02.62	1457983939837821094	1447661933183504635	https://pca.st/episode/f2b913f4-3e0f-4dd2-9711-2ea6a4861349\n\nSpecifically the part of the discussion where they talk about educating with AI, rather than without.	734442122450829343	quirx_	https://pca.st/episode/f2b913f4-3e0f-4dd2-9711-2ea6a4861349	Neurotechnology (AI + BRAIN TECH) with Nita Farahany	A podcast episode exploring the intersection of artificial intelligence and brain technology, with specific discussion on how AI should be integrated into education rather than excluded from it.	podcast	{AI,Tech,Science,Psychology}	60 min	8	informative	This podcast episode features Nita Farahany discussing neurotechnology and the convergence of AI with brain science. The recommender specifically highlights the segment about incorporating AI into educational approaches rather than avoiding it entirely.	https://static.pocketcasts.com/discover/images/webp/480/eb7f8fa0-73d4-0135-9034-63f4b61a9224.webp	athenaeum	Hard Science	{Podcast,Psychology,"Hot Topic"}	1461419171979198767	1461419171979198767	t	\N	0	2026-01-15 17:58:02.619	0	\N	\N
cmkfr62rm000pnf0639gdiij4	2026-01-15 17:58:02.627	2026-01-15 17:58:24.192	1458340968473559060	1447661933183504635	https://pca.st/episode/7b7e3ea7-f8fa-441b-a564-cd692596751d	734442122450829343	quirx_	https://pca.st/episode/7b7e3ea7-f8fa-441b-a564-cd692596751d	1166: Andy Morgan | How I Finally Got Shredded (And You Can Too)	A podcast episode featuring Andy Morgan discussing his personal journey to achieving a shredded physique and sharing actionable strategies that others can implement to achieve similar results.	podcast	{Fitness,Health,Self-Improvement,Nutrition}	60 min	7	informative	Andy Morgan shares his personal transformation story and practical approach to getting shredded, offering insights into the mindset, strategies, and methods that led to his success. The episode provides actionable advice for listeners looking to achieve similar body composition goals through sustainable practices.	https://static.pocketcasts.com/discover/images/webp/480/bf64f210-ed8c-0135-c25e-7d73a919276a.webp	growth	Health & Fitness	{Podcast,Beginner,"Quick Tip"}	1461419262408261747	1461419262408261747	t	\N	0	2026-01-15 17:58:24.191	0	\N	\N
cmkfr6jeu000qnf06w813frkm	2026-01-15 17:58:24.198	2026-01-15 17:58:35.368	1459482498147811338	1447661933183504635	https://www.audible.com/pd/B00UVX3HRE?source_code=ASSOR150021921000O	734442122450829343	quirx_	https://www.audible.com/pd/B00UVX3HRE?source_code=ASSOR150021921000O	Team of Teams	Former four-star general Stanley McChrystal shares a new leadership model based on his experiences leading Joint Special Operations Command during the War on Terror. The book explores how traditional hierarchical structures must evolve into networked teams to succeed in complex, rapidly changing environments.	book	{Career,Self-Improvement,Psychology}	10 hours	8	informative	McChrystal argues that traditional command-and-control leadership structures are inadequate for modern challenges, advocating instead for creating networks of empowered teams that can adapt quickly to changing circumstances. Drawing from military experience, the book provides practical insights on building organizational agility and fostering collaboration across complex systems.	https://m.media-amazon.com/images/I/51-DGYCqHYL._SL10_UR1600,800_CR200,50,1200,630_CLa%7C1200,630%7C51-DGYCqHYL.jpg%7C0,0,1200,630+82,82,465,465_PJAdblSocialShare-Gradientoverlay-largeasin-0to70,TopLeft,0,0_PJAdblSocialShare-AudibleLogo-Large,TopLeft,600,270_OU01_ZBLISTENING%20ON,617,216,52,500,AudibleSansMd,30,255,255,255.jpg	growth	Leadership	{Business/Econ,Book,"Gold Standard"}	1461419309229412677	1461419309229412677	t	\N	0	2026-01-15 17:58:35.367	0	\N	\N
cmkfr6s1a000rnf06me6jyvdt	2026-01-15 17:58:35.374	2026-01-15 17:58:43.061	1460639956484620476	1447661933183504635	https://www.youtube.com/watch?v=guuGl34HI3Q	1082084658042392587	thecoderanger	https://www.youtube.com/watch?v=guuGl34HI3Q	YouTube Video - Content Unavailable	A YouTube video that was recommended but the content details are not accessible or available for analysis.	video	{}	\N	1	neutral	This appears to be a YouTube video recommendation, but the video content, title, channel information, and description are all unavailable or inaccessible. Without any content details, it's impossible to determine the video's subject matter, quality, or relevance.	\N	athenaeum	Fringe/Mystery	{}	1461419341185810677	1461419341185810677	t	\N	0	2026-01-15 17:58:43.059	0	\N	\N
cmkfr6xyy000snf06ierjepde	2026-01-15 17:58:43.067	2026-01-15 17:58:56.635	1460884720454729859	1447661933183504635	https://pca.st/episode/14c9928f-82c8-496a-a775-b2b72fc258d1	734442122450829343	quirx_	https://pca.st/episode/14c9928f-82c8-496a-a775-b2b72fc258d1	Doing it the Hard Way	A podcast episode that appears to discuss approaches to tackling challenges or problems through more difficult but potentially more rewarding methods.	podcast	{Self-Improvement,Psychology}	\N	6	neutral	This podcast episode explores the concept of choosing difficult approaches over easy ones. Without additional context from the full episode content, the title suggests a discussion about embracing challenges and potentially finding value in more demanding paths to achievement.	https://static.pocketcasts.com/discover/images/webp/480/7868f900-21de-0133-2464-059c869cc4eb.webp	growth	Podcast	{Self-Improvement,"Mental Health",Productivity}	1461419398731530411	1461419398731530411	t	\N	0	2026-01-15 17:58:56.634	0	\N	\N
cmkfr78g1000tnf06iwu065vp	2026-01-15 17:58:56.642	2026-01-15 17:59:06.285	1461239820801150987	1447661933183504635	https://pca.st/episode/c7069816-99ee-4faa-b6db-6fae5b69f6da	734442122450829343	quirx_	https://pca.st/episode/c7069816-99ee-4faa-b6db-6fae5b69f6da	330 - A More Beautiful Question - Warren Berger (rebroadcast)	A podcast episode exploring Warren Berger's approach to inquiry and questioning as tools for innovation, problem-solving, and personal development.	podcast	{Self-Improvement,Productivity,Psychology}	45 min	7	informative	This rebroadcast episode features Warren Berger discussing his book 'A More Beautiful Question' and how the art of inquiry can transform how we approach challenges and opportunities. The content focuses on practical frameworks for asking better questions to drive innovation and personal growth.	https://static.pocketcasts.com/discover/images/webp/480/13b91b40-06b2-0132-a441-5f4c86fd3263.webp	growth	Productivity	{Leadership,"Mental Health",Book}	1461419438640332944	1461419438640332944	t	\N	0	2026-01-15 17:59:06.284	0	\N	\N
\.


--
-- Data for Name: thread_engagement; Type: TABLE DATA; Schema: public; Owner: refactor
--

COPY public.thread_engagement (id, "createdAt", "updatedAt", "threadId", "recommendationId", "totalMessages", "userMessages", "botMessages", "uniqueUsers", "topicsDiscussed", "avgResponseTime", "participantIds", "participantNames", "firstMessageAt", "lastMessageAt", "engagementScore") FROM stdin;
\.


--
-- Name: conversation_messages conversation_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: refactor
--

ALTER TABLE ONLY public.conversation_messages
    ADD CONSTRAINT conversation_messages_pkey PRIMARY KEY (id);


--
-- Name: guild_configs guild_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: refactor
--

ALTER TABLE ONLY public.guild_configs
    ADD CONSTRAINT guild_configs_pkey PRIMARY KEY (id);


--
-- Name: processing_logs processing_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: refactor
--

ALTER TABLE ONLY public.processing_logs
    ADD CONSTRAINT processing_logs_pkey PRIMARY KEY (id);


--
-- Name: recommendations recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: refactor
--

ALTER TABLE ONLY public.recommendations
    ADD CONSTRAINT recommendations_pkey PRIMARY KEY (id);


--
-- Name: thread_engagement thread_engagement_pkey; Type: CONSTRAINT; Schema: public; Owner: refactor
--

ALTER TABLE ONLY public.thread_engagement
    ADD CONSTRAINT thread_engagement_pkey PRIMARY KEY (id);


--
-- Name: conversation_messages_createdAt_idx; Type: INDEX; Schema: public; Owner: refactor
--

CREATE INDEX "conversation_messages_createdAt_idx" ON public.conversation_messages USING btree ("createdAt");


--
-- Name: conversation_messages_messageId_key; Type: INDEX; Schema: public; Owner: refactor
--

CREATE UNIQUE INDEX "conversation_messages_messageId_key" ON public.conversation_messages USING btree ("messageId");


--
-- Name: conversation_messages_recommendationId_idx; Type: INDEX; Schema: public; Owner: refactor
--

CREATE INDEX "conversation_messages_recommendationId_idx" ON public.conversation_messages USING btree ("recommendationId");


--
-- Name: conversation_messages_threadId_idx; Type: INDEX; Schema: public; Owner: refactor
--

CREATE INDEX "conversation_messages_threadId_idx" ON public.conversation_messages USING btree ("threadId");


--
-- Name: conversation_messages_userId_idx; Type: INDEX; Schema: public; Owner: refactor
--

CREATE INDEX "conversation_messages_userId_idx" ON public.conversation_messages USING btree ("userId");


--
-- Name: guild_configs_guildId_key; Type: INDEX; Schema: public; Owner: refactor
--

CREATE UNIQUE INDEX "guild_configs_guildId_key" ON public.guild_configs USING btree ("guildId");


--
-- Name: processing_logs_createdAt_idx; Type: INDEX; Schema: public; Owner: refactor
--

CREATE INDEX "processing_logs_createdAt_idx" ON public.processing_logs USING btree ("createdAt");


--
-- Name: processing_logs_recommendationId_idx; Type: INDEX; Schema: public; Owner: refactor
--

CREATE INDEX "processing_logs_recommendationId_idx" ON public.processing_logs USING btree ("recommendationId");


--
-- Name: recommendations_contentType_idx; Type: INDEX; Schema: public; Owner: refactor
--

CREATE INDEX "recommendations_contentType_idx" ON public.recommendations USING btree ("contentType");


--
-- Name: recommendations_createdAt_idx; Type: INDEX; Schema: public; Owner: refactor
--

CREATE INDEX "recommendations_createdAt_idx" ON public.recommendations USING btree ("createdAt");


--
-- Name: recommendations_forumPostId_key; Type: INDEX; Schema: public; Owner: refactor
--

CREATE UNIQUE INDEX "recommendations_forumPostId_key" ON public.recommendations USING btree ("forumPostId");


--
-- Name: recommendations_forumThreadId_idx; Type: INDEX; Schema: public; Owner: refactor
--

CREATE INDEX "recommendations_forumThreadId_idx" ON public.recommendations USING btree ("forumThreadId");


--
-- Name: recommendations_forumThreadId_key; Type: INDEX; Schema: public; Owner: refactor
--

CREATE UNIQUE INDEX "recommendations_forumThreadId_key" ON public.recommendations USING btree ("forumThreadId");


--
-- Name: recommendations_libraryType_idx; Type: INDEX; Schema: public; Owner: refactor
--

CREATE INDEX "recommendations_libraryType_idx" ON public.recommendations USING btree ("libraryType");


--
-- Name: recommendations_originalMessageId_key; Type: INDEX; Schema: public; Owner: refactor
--

CREATE UNIQUE INDEX "recommendations_originalMessageId_key" ON public.recommendations USING btree ("originalMessageId");


--
-- Name: recommendations_processed_idx; Type: INDEX; Schema: public; Owner: refactor
--

CREATE INDEX recommendations_processed_idx ON public.recommendations USING btree (processed);


--
-- Name: recommendations_recommenderId_idx; Type: INDEX; Schema: public; Owner: refactor
--

CREATE INDEX "recommendations_recommenderId_idx" ON public.recommendations USING btree ("recommenderId");


--
-- Name: thread_engagement_engagementScore_idx; Type: INDEX; Schema: public; Owner: refactor
--

CREATE INDEX "thread_engagement_engagementScore_idx" ON public.thread_engagement USING btree ("engagementScore");


--
-- Name: thread_engagement_recommendationId_idx; Type: INDEX; Schema: public; Owner: refactor
--

CREATE INDEX "thread_engagement_recommendationId_idx" ON public.thread_engagement USING btree ("recommendationId");


--
-- Name: thread_engagement_recommendationId_key; Type: INDEX; Schema: public; Owner: refactor
--

CREATE UNIQUE INDEX "thread_engagement_recommendationId_key" ON public.thread_engagement USING btree ("recommendationId");


--
-- Name: thread_engagement_threadId_idx; Type: INDEX; Schema: public; Owner: refactor
--

CREATE INDEX "thread_engagement_threadId_idx" ON public.thread_engagement USING btree ("threadId");


--
-- Name: thread_engagement_threadId_key; Type: INDEX; Schema: public; Owner: refactor
--

CREATE UNIQUE INDEX "thread_engagement_threadId_key" ON public.thread_engagement USING btree ("threadId");


--
-- Name: conversation_messages conversation_messages_recommendationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: refactor
--

ALTER TABLE ONLY public.conversation_messages
    ADD CONSTRAINT "conversation_messages_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES public.recommendations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: thread_engagement thread_engagement_recommendationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: refactor
--

ALTER TABLE ONLY public.thread_engagement
    ADD CONSTRAINT "thread_engagement_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES public.recommendations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict Jmwy40soeakhR6wZZLwyq2lGD0xxD1kXt0xDhhaN9u11ak6mEhk8iRT01Xxjcyw

