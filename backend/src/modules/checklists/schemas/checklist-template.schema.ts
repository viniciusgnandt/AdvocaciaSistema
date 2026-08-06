import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class ItemChecklist {
  @Prop({ required: true })
  titulo: string;

  // prazo do item em dias corridos a partir do momento em que o checklist e' aplicado
  @Prop({ required: true, default: 7 })
  dias_prazo: number;
}
export const ItemChecklistSchema = SchemaFactory.createForClass(ItemChecklist);

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class ChecklistTemplate extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenant_id: Types.ObjectId;

  @Prop({ required: true })
  nome: string;

  @Prop({ type: [ItemChecklistSchema], default: [] })
  itens: ItemChecklist[];
}

export const ChecklistTemplateSchema = SchemaFactory.createForClass(ChecklistTemplate);
