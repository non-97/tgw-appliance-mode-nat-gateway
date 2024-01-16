import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Tgw } from "./construct/tgw";
import { Vpc } from "./construct/vpc";
import { TgwRouteTable } from "./construct/tgw-route-table";
import { Ec2Instance } from "./construct/ec2-instance";

export class TgwStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const tgw = new Tgw(this, "Tgw", {});

    const vpcA = new Vpc(this, "VpcA", {
      vpcCidr: "10.1.1.0/24",
      natGateways: 0,
      subnetConfiguration: [
        {
          name: "Egress",
          subnetType: cdk.aws_ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 27,
        },
        {
          name: "Tgw",
          subnetType: cdk.aws_ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 27,
        },
      ],
      tgwId: tgw.tgwId,
      applianceModeSupport: "disable",
    });

    const vpcB = new Vpc(this, "VpcB", {
      vpcCidr: "10.1.2.0/24",
      natGateways: 2,
      subnetConfiguration: [
        {
          name: "Public",
          subnetType: cdk.aws_ec2.SubnetType.PUBLIC,
          cidrMask: 27,
          mapPublicIpOnLaunch: false,
        },
        {
          name: "Tgw",
          subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 27,
        },
      ],
      tgwId: tgw.tgwId,
      applianceModeSupport: "enable",
    });

    // Transit Gateway route table
    new TgwRouteTable(this, "TgwRouteTableVpcA", {
      tgwId: tgw.tgwId,
      associateTgwAttachmentIds: [vpcA.tgwAttachment.ref],
      propagationTgwAttachmentIds: [vpcB.tgwAttachment.ref],
      sharedVpcTgwAttachmentId: vpcB.tgwAttachment.ref,
    });
    new TgwRouteTable(this, "TgwRouteTableVpcB", {
      tgwId: tgw.tgwId,
      associateTgwAttachmentIds: [vpcB.tgwAttachment.ref],
      propagationTgwAttachmentIds: [vpcA.tgwAttachment.ref],
    });

    // EC2 Instance
    new Ec2Instance(this, "Ec2InstanceA", {
      vpc: vpcA.vpc,
      availabilityZones: [vpcA.vpc.availabilityZones[0]],
    });

    new Ec2Instance(this, "Ec2InstanceB", {
      vpc: vpcA.vpc,
      availabilityZones: [vpcA.vpc.availabilityZones[1]],
    });
  }
}
