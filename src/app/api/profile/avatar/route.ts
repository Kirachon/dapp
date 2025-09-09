import { NextResponse } from 'next/server';

// Deprecated: Avatar upload API replaced by GraphQL + S3 direct upload flows.
export async function POST() {
  try {
  return NextResponse.json({ error: 'Deprecated endpoint. Use GraphQL and direct uploads instead.' }, { status: 410 });

  } catch (error) {
    console.error('Avatar upload error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Failed to process')) {
        return NextResponse.json(
          { success: false, error: { code: 'PROCESSING_ERROR', message: 'Failed to process image' } },
          { status: 400 }
        );
      }
      
      if (error.message.includes('Failed to upload')) {
        return NextResponse.json(
          { success: false, error: { code: 'UPLOAD_ERROR', message: 'Failed to upload image' } },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
  return NextResponse.json({ error: 'Deprecated endpoint. Use GraphQL and direct uploads instead.' }, { status: 410 });
  } catch (error) {
    return NextResponse.json({ error: 'Deprecated endpoint. Use GraphQL and direct uploads instead.' }, { status: 410 });
  }
}
