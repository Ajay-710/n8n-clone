import { Controller, Sse, MessageEvent } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, fromEvent } from 'rxjs';
import { map } from 'rxjs/operators';

@Controller('api/v1/events')
export class EventsController {
  constructor(private eventEmitter: EventEmitter2) {}

  @Sse('executions')
  sse(): Observable<MessageEvent> {
    return fromEvent(this.eventEmitter, 'execution.event').pipe(
      map((payload) => ({ data: payload as object }))
    );
  }
}
