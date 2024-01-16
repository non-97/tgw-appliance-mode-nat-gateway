import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export interface TgwRouteTableProps {
  tgwId: string;
  associateTgwAttachmentIds: string[];
  propagationTgwAttachmentIds: string[];
  sharedVpcTgwAttachmentId?: string;
}

export class TgwRouteTable extends Construct {
  constructor(scope: Construct, id: string, props: TgwRouteTableProps) {
    super(scope, id);

    // Transit Gateway route table
    const tgwRouteTable = new cdk.aws_ec2.CfnTransitGatewayRouteTable(
      this,
      "Default",
      {
        transitGatewayId: props.tgwId,
      }
    );

    // Associate Transit Gateway attachment
    props.associateTgwAttachmentIds.forEach(
      (associateTgwAttachmentId, index) => {
        new cdk.aws_ec2.CfnTransitGatewayRouteTableAssociation(
          this,
          `Association${index}`,
          {
            transitGatewayAttachmentId: associateTgwAttachmentId,
            transitGatewayRouteTableId: tgwRouteTable.ref,
          }
        );
      }
    );

    //  Propagation Transit Gateway attachment
    props.propagationTgwAttachmentIds.forEach(
      (propagationTgwAttachmentId, index) => {
        new cdk.aws_ec2.CfnTransitGatewayRouteTablePropagation(
          this,
          `Propagation${index}`,
          {
            transitGatewayAttachmentId: propagationTgwAttachmentId,
            transitGatewayRouteTableId: tgwRouteTable.ref,
          }
        );
      }
    );

    // Static Route to Inspection VPC
    if (typeof props.sharedVpcTgwAttachmentId === "undefined") {
      return;
    }
    new cdk.aws_ec2.CfnTransitGatewayRoute(this, "RouteSharedVpc", {
      transitGatewayAttachmentId: props.sharedVpcTgwAttachmentId,
      transitGatewayRouteTableId: tgwRouteTable.ref,
      destinationCidrBlock: "0.0.0.0/0",
    });
  }
}
