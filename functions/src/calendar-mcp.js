import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events'
];

export class CalendarMCPHandler {
  constructor() {
    this.calendar = null;
    this.initializeAuth();
  }

  async initializeAuth() {
    try {
      // Use service account from Firebase environment
      const auth = new GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
        scopes: SCOPES,
        subject: process.env.GOOGLE_CALENDAR_USER_EMAIL // User to impersonate
      });

      this.calendar = google.calendar({ version: 'v3', auth });
    } catch (error) {
      console.error('Auth initialization failed:', error);
      throw error;
    }
  }

  async listTools() {
    return {
      tools: [
        {
          name: "list_events",
          description: "List calendar events for a specific date range",
          inputSchema: {
            type: "object",
            properties: {
              timeMin: {
                type: "string",
                description: "Start time (ISO 8601 format)",
              },
              timeMax: {
                type: "string",
                description: "End time (ISO 8601 format)",
              },
              maxResults: {
                type: "number",
                description: "Maximum number of events to return (default: 10)",
                default: 10,
              },
            },
            required: ["timeMin", "timeMax"],
          },
        },
        {
          name: "get_today_events",
          description: "Get today's calendar events",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "create_event",
          description: "Create a new calendar event",
          inputSchema: {
            type: "object",
            properties: {
              summary: { type: "string", description: "Event title" },
              description: { type: "string", description: "Event description" },
              startTime: { type: "string", description: "Start time (ISO 8601)" },
              endTime: { type: "string", description: "End time (ISO 8601)" },
              attendees: {
                type: "array",
                items: { type: "string" },
                description: "List of attendee email addresses",
              },
            },
            required: ["summary", "startTime", "endTime"],
          },
        },
      ],
    };
  }

  async callTool(name, args) {
    if (!this.calendar) {
      await this.initializeAuth();
    }

    switch (name) {
      case "list_events":
        return this.listEvents(args.timeMin, args.timeMax, args.maxResults);
      case "get_today_events":
        return this.getTodayEvents();
      case "create_event":
        return this.createEvent(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  async listEvents(timeMin, timeMax, maxResults = 10) {
    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin,
        timeMax,
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];
      
      if (events.length === 0) {
        return {
          content: [{ type: "text", text: "No events found for the specified time range." }],
        };
      }

      const eventList = events.map(event => {
        const start = event.start.dateTime || event.start.date;
        const end = event.end.dateTime || event.end.date;
        return `• ${event.summary} (${start} - ${end})`;
      }).join('\n');

      return {
        content: [{ type: "text", text: `Found ${events.length} events:\n\n${eventList}` }],
      };
    } catch (error) {
      throw new Error(`Failed to list events: ${error.message}`);
    }
  }

  async getTodayEvents() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return this.listEvents(today.toISOString(), tomorrow.toISOString());
  }

  async createEvent(eventData) {
    try {
      const event = {
        summary: eventData.summary,
        description: eventData.description,
        start: { dateTime: eventData.startTime },
        end: { dateTime: eventData.endTime },
      };

      if (eventData.attendees) {
        event.attendees = eventData.attendees.map(email => ({ email }));
      }

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });

      return {
        content: [{
          type: "text",
          text: `Event created: ${response.data.summary}\nID: ${response.data.id}\nLink: ${response.data.htmlLink}`
        }],
      };
    } catch (error) {
      throw new Error(`Failed to create event: ${error.message}`);
    }
  }
}