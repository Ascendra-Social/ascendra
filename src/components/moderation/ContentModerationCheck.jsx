import { base44 } from '@/api/base44Client';

/**
 * AI-powered content moderation system
 * Checks for hate speech, harassment, fear-based content, and misinformation
 */
export async function moderateContent(content, imageUrl = null, contentType = 'post', authorId = null) {
  try {
    const prompt = `You are a content moderation AI for a positive social media platform. Analyze the following content for safety and community guidelines violations.

Content: "${content}"

Check for:
1. Hate speech or discrimination
2. Harassment or bullying
3. Fear-based or panic-inducing content
4. Misinformation or false claims
5. Violence or threats
6. Spam or manipulation

Rate the content on:
- safety_score (0-1, where 1 is completely safe)
- severity (0-1, where 1 is most severe violation)
- violation_type (hate_speech, harassment, fear_based, misinformation, spam, violence, or none)
- should_block (true if content should be blocked immediately)
- should_flag (true if content needs human review)
- explanation (brief explanation of the decision)

Return JSON only.`;

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false,
      file_urls: imageUrl ? [imageUrl] : undefined,
      response_json_schema: {
        type: "object",
        properties: {
          safety_score: { type: "number" },
          severity: { type: "number" },
          violation_type: { 
            type: "string",
            enum: ["hate_speech", "harassment", "fear_based", "misinformation", "spam", "violence", "none"]
          },
          should_block: { type: "boolean" },
          should_flag: { type: "boolean" },
          explanation: { type: "string" }
        }
      }
    });

    // Log moderation check
    if (authorId && (analysis.should_block || analysis.should_flag)) {
      await base44.entities.ContentModeration.create({
        content_type: contentType,
        content_text: content,
        author_id: authorId,
        moderation_status: analysis.should_block ? 'removed' : 'flagged',
        violation_type: analysis.violation_type || 'none',
        severity: analysis.severity || 0,
        safety_score: analysis.safety_score || 1,
        ai_explanation: analysis.explanation || '',
        auto_removed: analysis.should_block
      });
    }

    return {
      approved: !analysis.should_block,
      flagged: analysis.should_flag,
      ...analysis
    };
  } catch (error) {
    console.error('Moderation check failed:', error);
    // Default to safe on error
    return {
      approved: true,
      flagged: false,
      safety_score: 1,
      severity: 0,
      violation_type: 'none',
      should_block: false,
      should_flag: false,
      explanation: 'Moderation check failed'
    };
  }
}

/**
 * Check if user has violations history
 */
export async function checkUserViolations(userId) {
  const violations = await base44.entities.ContentModeration.filter({
    author_id: userId,
    moderation_status: 'removed'
  });
  
  return {
    totalViolations: violations.length,
    recentViolations: violations.filter(v => {
      const createdDate = new Date(v.created_date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return createdDate > thirtyDaysAgo;
    }).length
  };
}