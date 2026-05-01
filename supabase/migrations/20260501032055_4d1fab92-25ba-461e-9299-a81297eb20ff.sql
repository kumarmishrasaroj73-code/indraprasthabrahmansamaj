
-- Ensure unique key for upsert
CREATE UNIQUE INDEX IF NOT EXISTS intro_content_section_lang_uniq ON public.intro_content (section_key, language);

-- HINDI content
INSERT INTO public.intro_content (section_key, language, title, body, display_order) VALUES
('about', 'hi', 'संस्था की प्रेरणा एवं आधार',
'आदरणीय श्रीमन्महानुभावों,

वर्तमान सामाजिक परिस्थितियों का गंभीरता से अवलोकन करने पर यह स्पष्ट होता है कि विभिन्न क्षेत्रों में ब्राह्मण समाज की उपेक्षा सुनियोजित रूप से की जा रही है तथा अन्य वर्गों में ब्राह्मणों के प्रति विद्वेष की भावना का अनावश्यक प्रसार किया जा रहा है। यह स्थिति न केवल ब्राह्मण समाज के लिए, बल्कि संपूर्ण मानव समाज की समरसता के लिए भी प्रतिकूल है।

ऐसे अज्ञानता से ओतप्रोत वातावरण में ब्राह्मण समाज में पुनः जागरूकता लाना एवं उसे संगठित रखना समय की अत्यंत महत्वपूर्ण आवश्यकता है।', 1),

('history', 'hi', 'हमारी यात्रा',
'इन्हीं विषम परिस्थितियों को दृष्टिगत रखते हुए, पूज्य पूर्वजों के आशीर्वाद से, इंद्रप्रस्थ ब्राह्मण समाज (पंजी०) की स्थापना की गई। यह संस्था प्रारंभ में समान विचारधारा वाले कुछ ब्राह्मण परिवारों के छोटे समूह के रूप में आरंभ हुई थी, जो आज निरंतर प्रगति करते हुए विभिन्न पीढ़ियों के अनेक परिवारों को एक सशक्त मंच पर जोड़ने वाली सजीव एवं सक्रिय संस्था बन चुकी है।

पिछले कुछ वर्षों में संस्था द्वारा अनेक सांस्कृतिक कार्यक्रमों का सफल आयोजन किया गया है, विद्वानों को यथासंभव सम्मान एवं सहयोग प्रदान किया गया है, तथा समाज की विविध आवश्यकताओं की पूर्ति हेतु निकट भविष्य में एक भव्य भवन के निर्माण का संकल्प भी लिया गया है।', 2),

('mission', 'hi', 'हमारा ध्येय (Mission)',
'• सामाजिक स्तर पर व्याप्त पूर्वाग्रहों को दूर करना।
• सनातन धर्म एवं वैदिक परंपराओं के संबंध में प्रामाणिक एवं सही जानकारी समाज के समक्ष प्रस्तुत करना।
• ब्राह्मण समाज में पुनः जागरूकता लाकर उसे संगठित रखना।
• विद्वानों का सम्मान एवं सहयोग तथा सांस्कृतिक कार्यक्रमों का आयोजन।
• तन, मन एवं धन से सेवा भाव से समाज के सर्वांगीण उत्थान हेतु निरंतर कार्य करना।', 3),

('vision', 'hi', 'हमारी दृष्टि (Vision)',
'• समरसता, जागरूकता एवं एकता से सुदृढ़ ब्राह्मण समाज।
• विभिन्न पीढ़ियों के परिवारों को जोड़ने वाला एक सशक्त मंच।
• समाज की विविध आवश्यकताओं की पूर्ति हेतु एक भव्य भवन का निर्माण।
• सनातन धर्म एवं वैदिक परंपराओं की प्रामाणिक प्रस्तुति द्वारा संपूर्ण मानव समाज में समरसता का प्रसार।

॥ इत्योश्म ॥', 4)
ON CONFLICT (section_key, language) DO UPDATE
SET title = EXCLUDED.title, body = EXCLUDED.body, display_order = EXCLUDED.display_order, updated_at = now();

-- ENGLISH content (refined translation of the same foundational text)
INSERT INTO public.intro_content (section_key, language, title, body, display_order) VALUES
('about', 'en', 'Our Inspiration & Foundation',
'Respected community members,

A careful observation of present social conditions makes it clear that the Brahman community is being systematically overlooked in many spheres, while prejudice against Brahmans is being needlessly spread among other sections of society. This situation is harmful not only to the Brahman community, but to the harmony of the entire human society.

In such an environment clouded by misunderstanding, it has become an urgent need of our time to reawaken the Brahman community and keep it well-organised.', 1),

('history', 'en', 'Our Journey',
'Keeping these challenging circumstances in view, and with the blessings of our revered elders, Indraprastha Brahman Samaj (Regd.) was founded. What began as a small group of like-minded Brahman families has steadily grown into a living, active institution that brings together families across many generations onto one strong platform.

Over the years the Samaj has successfully organised numerous cultural programmes, honoured and supported scholars wherever possible, and resolved to build, in the near future, a grand community building to serve the diverse needs of our society.', 2),

('mission', 'en', 'Our Mission',
'• Dispel the prejudices prevailing at the social level.
• Present authentic and correct information about Sanatan Dharma and Vedic traditions.
• Reawaken and unite the Brahman community.
• Honour scholars and organise meaningful cultural programmes.
• Serve the all-round upliftment of society with mind, body, and resources, in a true spirit of seva.', 3),

('vision', 'en', 'Our Vision',
'• A Brahman community strengthened by harmony, awareness and unity.
• A powerful platform that connects families across generations.
• A grand community building to serve the diverse needs of the Samaj.
• Spreading harmony across the wider human society through an authentic understanding of Sanatan Dharma and Vedic traditions.

॥ Ityosham ॥', 4)
ON CONFLICT (section_key, language) DO UPDATE
SET title = EXCLUDED.title, body = EXCLUDED.body, display_order = EXCLUDED.display_order, updated_at = now();
