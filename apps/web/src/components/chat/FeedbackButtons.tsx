

interface FeedbackButtonsProps {
  conversationId: string;
  messageId: string;
}

export function FeedbackButtons({ messageId }: FeedbackButtonsProps) {
  return (
    <div className="feedback-buttons" style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
      <button onClick={() => console.log('Upvoted', messageId)} title="Good response">👍</button>
      <button onClick={() => console.log('Downvoted', messageId)} title="Bad response">👎</button>
    </div>
  );
}
