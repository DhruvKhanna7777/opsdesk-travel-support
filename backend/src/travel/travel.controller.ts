import { RotationPolicyDto } from './rotation.dto';
import { ContractPolicyDto, ContractDirectoryDto } from './contracts.dto';
import { SupplierCalendarDto } from './sla.dto';
import { HandoffPolicyDto } from './sla.dto';
import { CalendarPolicyDto, SlaPauseDto, EscalationOwnerDto } from './sla.dto';
import { TravelDirectoryDto } from './travel-directory.dto';
import { ConversationRecipientsDto } from './conversation-recipients';
import { TicketThemesDto } from './ticket-themes';
import {
  Body,
  Controller,
  Get,
  Header,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { Readable } from 'node:stream';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.type';
import { TravelService } from './travel.service';
import { TravelQueueDto } from './travel-queue.dto';
import { TravelPageDto } from './travel-page.dto';
import {
  AgencyResponsePolicyDto,
  AgentSpecialtiesDto,
  AvailabilityDto,
  BookingScheduleDto,
  ConversationStatusDto,
  ClockDto,
  EscalateToEmDto,
  NewConversationDto,
  NewTravelTicketDto,
  SupplierReplyDto,
  TravelMessageDto,
  UpdateTravelTicketDto,
} from './travel.dto';
@Controller('ops')
@UseGuards(JwtAuthGuard)
export class TravelController {
  private readonly logger = new Logger(TravelController.name);
  constructor(private readonly travel: TravelService) {}
  @Get('escalation-rotations') rotations(@Req() req: AuthenticatedRequest) {
    return this.travel.rotations(req.user.userId);
  }
  @Patch('escalation-rotations/:region') rotation(
    @Req() req: AuthenticatedRequest,
    @Param('region') region: string,
    @Body() dto: RotationPolicyDto,
  ) {
    return this.travel.configureRotation(req.user.userId, region, dto);
  }
  @Get('contracts') contracts(
    @Req() req: AuthenticatedRequest,
    @Query() query: ContractDirectoryDto,
  ) {
    return this.travel.contracts(req.user.userId, query);
  }
  @Post('agencies/:id/contracts') createContract(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ContractPolicyDto,
  ) {
    return this.travel.saveContract(req.user.userId, id, null, dto);
  }
  @Patch('agencies/:id/contracts/:contractId') updateContract(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('contractId') contractId: string,
    @Body() dto: ContractPolicyDto,
  ) {
    return this.travel.saveContract(req.user.userId, id, contractId, dto);
  }
  @Get('workspace') async workspace(
    @Req() req: AuthenticatedRequest,
    @Query('compact') compact?: string,
  ) {
    const compactMode = compact === '1';
    const response = await this.travel.workspace(req.user.userId, compactMode);
    if (process.env.OPSDESK_WORKSPACE_OBSERVATION === 'true') {
      const kind = response.me.kind;
      try {
        this.logger.log(
          JSON.stringify({
            event: 'opsdesk.workspace.response',
            version: 1,
            at: new Date().toISOString(),
            mode: compactMode ? 'compact' : 'full',
            role: [
              'MANAGER',
              'AGENT',
              'AGENCY',
              'CUSTOMER',
              'SUPPLIER',
            ].includes(kind)
              ? kind
              : 'UNKNOWN',
          }),
        );
      } catch {
        // Best-effort observation must not change the authorized response.
      }
    }
    return response;
  }
  @Get('bookings') bookings(
    @Req() req: AuthenticatedRequest,
    @Query() query: TravelDirectoryDto,
  ) {
    return this.travel.bookings(req.user.userId, query);
  }
  @Get('people') people(
    @Req() req: AuthenticatedRequest,
    @Query() query: TravelDirectoryDto,
  ) {
    return this.travel.people(req.user.userId, query);
  }
  @Get('tickets/:id') detail(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.travel.detail(req.user.userId, id);
  }
  @Get('tickets/:id/messages') messages(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query() query: TravelPageDto,
  ) {
    return this.travel.messages(req.user.userId, id, query);
  }
  @Get('tickets/:id/themes') themes(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.travel.ticketThemes(req.user.userId, id);
  }
  @Patch('tickets/:id/themes') updateThemes(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: TicketThemesDto,
  ) {
    return this.travel.updateTicketThemes(req.user.userId, id, dto);
  }
  @Get('conversations/:id/recipients') recipients(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.travel.conversationRecipients(req.user.userId, id);
  }
  @Patch('conversations/:id/recipients') updateRecipients(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ConversationRecipientsDto,
  ) {
    return this.travel.updateConversationRecipients(req.user.userId, id, dto);
  }
  @Get('tickets/:id/events') events(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query() query: TravelPageDto,
  ) {
    return this.travel.events(req.user.userId, id, query);
  }
  @Post('tickets/:id/alerts/:alertId/acknowledge') acknowledgeAlert(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('alertId') alertId: string,
  ) {
    return this.travel.acknowledgeAlert(req.user.userId, id, alertId);
  }
  @Post('tickets/:id/escalate-to-em') escalateToEm(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: EscalateToEmDto,
  ) {
    return this.travel.escalateToEm(req.user.userId, id, dto);
  }
  @Get('tickets/:id/related') related(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query() query: TravelPageDto,
  ) {
    return this.travel.related(req.user.userId, id, query);
  }
  @Get('bookings/:id/tickets') bookingTickets(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query() query: TravelPageDto,
  ) {
    return this.travel.bookingTickets(req.user.userId, id, query);
  }
  @Get('tickets/:id/conversations') conversations(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query() query: TravelPageDto,
  ) {
    return this.travel.conversations(req.user.userId, query, id);
  }
  @Get('conversations') supplierConversations(
    @Req() req: AuthenticatedRequest,
    @Query() query: TravelPageDto,
  ) {
    return this.travel.conversations(req.user.userId, query);
  }
  @Get('conversations/:id/messages') conversationMessages(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query() query: TravelPageDto,
  ) {
    return this.travel.conversationMessages(req.user.userId, id, query);
  }
  @Get('insights') insights(@Req() req: AuthenticatedRequest) {
    return this.travel.insights(req.user.userId);
  }
  @Get('queue') queue(
    @Req() req: AuthenticatedRequest,
    @Query() query: TravelQueueDto,
  ) {
    return this.travel.queue(req.user.userId, query);
  }
  @Get('queue/export')
  @Header('Cache-Control', 'private, no-store')
  async exportQueue(
    @Req() req: AuthenticatedRequest,
    @Query() query: TravelQueueDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rows = await this.travel.exportQueue(req.user.userId, query);
    return new StreamableFile(Readable.from(rows), {
      type: 'text/csv; charset=utf-8',
      disposition: 'attachment; filename="opsdesk-cases.csv"',
    }).setErrorHandler((error) => res.destroy(error));
  }
  @Post('tickets') create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: NewTravelTicketDto,
  ) {
    return this.travel.create(req.user.userId, dto);
  }
  @Patch('tickets/:id') update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateTravelTicketDto,
  ) {
    return this.travel.update(req.user.userId, id, dto);
  }
  @Post('tickets/:id/messages') message(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: TravelMessageDto,
  ) {
    return this.travel.message(req.user.userId, id, dto);
  }
  @Post('tickets/:id/conversations') conversation(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: NewConversationDto,
  ) {
    return this.travel.conversation(req.user.userId, id, dto);
  }
  @Post('conversations/:id/reply') reply(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: SupplierReplyDto,
  ) {
    return this.travel.reply(req.user.userId, id, dto);
  }
  @Patch('conversations/:id') conversationStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ConversationStatusDto,
  ) {
    return this.travel.conversationStatus(req.user.userId, id, dto.status);
  }
  @Post('clock/advance') clock(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ClockDto,
  ) {
    return this.travel.advance(req.user.userId, dto.minutes);
  }
  @Patch('availability') availability(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AvailabilityDto,
  ) {
    return this.travel.availability(req.user.userId, dto.available);
  }
  @Patch('bookings/:id/schedule') schedule(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: BookingScheduleDto,
  ) {
    return this.travel.updateSchedule(req.user.userId, id, dto);
  }
  @Patch('agents/:id/specialties') specialties(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: AgentSpecialtiesDto,
  ) {
    return this.travel.updateSpecialties(req.user.userId, id, dto);
  }
  @Patch('agencies/:id/response-policy') agencyResponsePolicy(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: AgencyResponsePolicyDto,
  ) {
    return this.travel.updateAgencyResponsePolicy(
      req.user.userId,
      id,
      dto.responseTargetHours,
    );
  }
  @Patch('agencies/:id/calendar') calendar(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: CalendarPolicyDto,
  ) {
    return this.travel.configureCalendar(req.user.userId, id, dto);
  }
  @Patch('suppliers/:id/calendar') supplierCalendar(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: SupplierCalendarDto,
  ) {
    return this.travel.configureSupplierCalendar(req.user.userId, id, dto);
  }
  @Patch('members/:id/shift') shift(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: CalendarPolicyDto,
  ) {
    return this.travel.configureShift(req.user.userId, id, dto);
  }
  @Patch('tickets/:id/sla-pause') pause(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: SlaPauseDto,
  ) {
    return this.travel.pauseSla(req.user.userId, id, dto);
  }
  @Patch('tickets/:id/handoff-policy') handoffPolicy(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: HandoffPolicyDto,
  ) {
    return this.travel.handoffPolicy(req.user.userId, id, dto);
  }
  @Patch('tickets/:id/escalation-owner') escalationOwner(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: EscalationOwnerDto,
  ) {
    return this.travel.assignEscalationOwner(req.user.userId, id, dto);
  }
}
