import type React from 'react';

interface FeedbackButtonsProps {
  conversationId: string;
  messageId: string;
}

export function FeedbackButtons({
  messageId: _messageId,
}: FeedbackButtonsProps): React.JSX.Element {
  return (
    <div className="feedback-buttons" style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
      <button
        onClick={(): void => {
          /* Upvoted */
        }}
        title="Good response"
      >
        👍
      </button>
      <button
        onClick={(): void => {
          /* Downvoted */
        }}
        title="Bad response"
      >
        👎
      </button>
    </div>
  );
}
