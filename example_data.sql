CREATE TABLE `grades` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `grade` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `input` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `sd_prompt_filtered` mediumtext,
  `appearance` mediumtext,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `grades` (`id`, `grade`) VALUES (833477, 'Good');

INSERT INTO `input` (`id`, `name`, `sd_prompt_filtered`, `appearance`) VALUES
  (833477, 'Ji-yeon', 'Coastal beauty, girl in a charming nautical outfit, striped shirt, bright eyes, sun-kissed skin, carefree expression, sandy beach background, lighthouse, gentle sea breeze, playful pose, dynamic composition, golden hour lighting, blurred background, rich colors, fine details, 50mm lens, relaxed atmosphere. portrait photography, 35mm film, natural blurry', 'Ji-yeon is a young woman with long, straight black hair that gently cascades down her shoulders. Her face is adorned with a soft and serene smile that radiates warmth and kindness. Her eyes, filled with a deep brown hue, reflect a sense of tranquility and wisdom beyond her years. She is wearing a white shirt with navy blue stripes, which gives her a casual and relaxed appearance. Her body language suggests a sense of calm and contentment as she sits by the beach, with the ocean as her backdrop. The lighting in her portrait is soft and warm, creating a peaceful and inviting atmosphere that complements her gentle and graceful presence.'),
  (833600, 'Mika', 'young woman stands on a weathered wooden dock extending over a still mountain lake at dusk. Dressed in cutoff denim shorts and a loose white tank top, she gazes pensively over the glassy waters with hands in her pockets. Her long honey-blonde hair glows in the golden light of the setting sun. A sense of peace and solitude pervades this high alpine scene at day\'s end as the sky fades into pastel hues and the loons begin their plaintive calls', 'Mika is a young woman with long, straight, dark black hair. She has a neutral expression on her face, with a slight softness in her eyes that suggest a thoughtful and introspective nature. Her gaze is directed towards the viewer, creating a sense of connection. Her attire consists of a simple white tank top and light blue denim shorts with a frayed hem, which gives her a casual, outdoor look.\nShe is standing on a wooden dock near a calm lake, with mountains visible in the distance. The lighting is golden and suggests either sunrise or sunset, adding a sense of tranquility to the scene. The overall composition of the image, with Mika standing by the water, suggests that she might be taking a break from a project or just enjoying the beauty of nature.');

