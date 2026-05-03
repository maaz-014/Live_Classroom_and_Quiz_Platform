import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { messaging } from '@/lib/firebase/server';
import nodemailer from 'nodemailer';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { courseId, quizTitle } = await request.json();

    if (!courseId || !quizTitle) {
      return NextResponse.json({ error: 'Missing courseId or quizTitle' }, { status: 400 });
    }

    // Verify authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch enrolled students for the course
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('student_id')
      .eq('course_id', courseId);

    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({ message: 'No students enrolled' });
    }

    const studentIds = enrollments.map((e: any) => e.student_id);

    // Fetch FCM tokens for those students
    const { data: students } = await supabase
      .from('users')
      .select('fcm_token')
      .in('id', studentIds)
      .not('fcm_token', 'is', null);

    const tokens = students?.map((s: any) => s.fcm_token).filter(Boolean) || [];

    // --- 1. SEND PUSH NOTIFICATIONS (Firebase) ---
    let pushSuccess = 0;
    let pushFailure = 0;
    if (tokens.length > 0) {
      if (!messaging) {
        console.log('Mock push notification sent to', tokens.length, 'devices');
      } else {
        const response = await messaging.sendEachForMulticast({
          tokens,
          notification: {
            title: 'Live Quiz Started!',
            body: `Your teacher just launched a quiz: ${quizTitle}, join now!`,
          },
          data: { courseId, click_action: '/dashboard' }
        });
        pushSuccess = response.successCount;
        pushFailure = response.failureCount;
      }
    }

    // --- 2. SEND EMAIL NOTIFICATIONS (Nodemailer + Gmail) ---
    let emailSuccess = 0;
    
    // We need the Service Role Key to bypass RLS and read auth.users to get their emails
    // And we need Gmail credentials to send the emails for free
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const studentEmails: string[] = [];
      
      // Fetch each student's email from auth.users
      for (const id of studentIds) {
        const { data } = await supabaseAdmin.auth.admin.getUserById(id);
        if (data?.user?.email) studentEmails.push(data.user.email);
      }

      if (studentEmails.length > 0) {
        try {
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: process.env.GMAIL_USER,
              pass: process.env.GMAIL_APP_PASSWORD,
            },
          });

          const mailOptions = {
            from: `"ClassHub" <${process.env.GMAIL_USER}>`,
            bcc: studentEmails, // Use BCC so students don't see each other's emails
            subject: '📚 Live Quiz Started!',
            html: `
              <div style="font-family: sans-serif; padding: 20px; text-align: center;">
                <h2>A new live quiz is starting!</h2>
                <p>Your teacher has just launched: <strong>${quizTitle}</strong></p>
                <p style="margin-top: 30px;">
                  <a href="${process.env.NEXT_PUBLIC_STUDENT_APP_URL || 'http://localhost:3000'}/dashboard" 
                     style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Join Quiz Now
                  </a>
                </p>
              </div>
            `
          };

          await transporter.sendMail(mailOptions);
          emailSuccess = studentEmails.length;
        } catch (emailErr) {
          console.error('Nodemailer error:', emailErr);
        }
      }
    } else {
      console.log('Skipping emails: Missing GMAIL_USER, GMAIL_APP_PASSWORD, or SUPABASE_SERVICE_ROLE_KEY');
    }

    return NextResponse.json({ 
      success: true, 
      pushSent: pushSuccess,
      emailsSent: emailSuccess
    });

  } catch (error: any) {
    console.error('Failed to send push notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
